import { Lead } from '../lead/lead.model';
import { Notification } from './notification.model';
import { NotificationService } from './notification.service';
import mongoose from 'mongoose';

/**
 * Service to check for overdue activities and create notifications
 * This runs daily to check for activities that are past their due date
 * 
 * Efficient approach:
 * 1. Query only uncompleted activities with date < today
 * 2. Check if notification already sent (using history.overdueNotificationSent)
 * 3. Create notification only for new overdue activities
 * 4. Mark as notified in history to prevent duplicate notifications
 */

export const checkAndNotifyOverdueActivities = async () => {
  try {
    console.log('🔍 Running overdue activity check...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Find all leads with uncompleted activities that are overdue (date < today)
    // Using MongoDB aggregation for better performance
    const leadsWithOverdueActivities = await Lead.aggregate([
      {
        // Match leads with activities
        $match: {
          'activities': { $exists: true, $ne: [] }
        }
      },
      {
        // Unwind activities to check each one
        $unwind: '$activities'
      },
      {
        // Match only uncompleted activities with date < today
        $match: {
          'activities.completed': false,
          $or: [
            {
              'activities.date': { $exists: true, $lt: today }
            },
            {
              'activities.meetingDate': { $exists: true, $lt: today }
            }
          ]
        }
      },
      {
        // Group back by lead
        $group: {
          _id: '$_id',
          lead: { $first: '$$ROOT' },
          overdueActivities: { $push: '$activities' }
        }
      },
      {
        // Lookup assignedTo user
        $lookup: {
          from: 'users',
          localField: 'lead.assignedTo',
          foreignField: '_id',
          as: 'assignedToUser'
        }
      }
    ]);
    
    console.log(`📊 Found ${leadsWithOverdueActivities.length} leads with overdue activities`);
    
    let notificationsCreated = 0;
    let notificationsSkipped = 0;
    
    // Process each lead with overdue activities
    for (const item of leadsWithOverdueActivities) {
      const lead = item.lead;
      const overdueActivities = item.overdueActivities;
      const assignedToUser = item.assignedToUser?.[0];
      
      if (!assignedToUser) {
        console.log(`⏭️ Skipping lead ${lead._id} - no assigned user`);
        continue;
      }
      
      // Get the full lead document to check history
      const fullLead = await Lead.findById(lead._id)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .populate('history.changedBy');
      
      if (!fullLead) continue;
      
      // Process each overdue activity
      for (const activity of overdueActivities) {
        // Find the corresponding history entry for this activity
        // Match by activity date and type
        const activityDate = activity.date || activity.meetingDate;
        const activityType = activity.type || 'activity';
        const activityDateObj = new Date(activityDate);
        activityDateObj.setHours(0, 0, 0, 0);
        
        // Find history entry that matches this activity
        // Match by: action === 'activity_added', date matches, and type matches
        const activityHistory = fullLead.history?.find((h: any) => {
          if (h.action !== 'activity_added') return false;
          
          // Check if description contains activity type
          const descriptionLower = (h.description || '').toLowerCase();
          const typeMatches = descriptionLower.includes(activityType.toLowerCase());
          
          // Check if timestamp is close to activity date (within 1 day)
          const historyDate = new Date(h.timestamp);
          historyDate.setHours(0, 0, 0, 0);
          const dateDiff = Math.abs(historyDate.getTime() - activityDateObj.getTime());
          const dateMatches = dateDiff < 24 * 60 * 60 * 1000; // Within 1 day
          
          return typeMatches && dateMatches;
        }) as any; // Type assertion for history entry with optional overdueNotificationSent
        
        // Skip if notification already sent
        if (activityHistory && (activityHistory as any).overdueNotificationSent) {
          console.log(`⏭️ Skipping activity ${activity._id} - notification already sent`);
          notificationsSkipped++;
          continue;
        }
        
        // Determine recipients (assigned user or createdBy if no assignedTo)
        const recipients: mongoose.Types.ObjectId[] = [];
        let triggeredBy: mongoose.Types.ObjectId | undefined;
        
        if (fullLead.assignedTo && (fullLead.assignedTo as any)._id) {
          const assignedToId = (fullLead.assignedTo as any)._id;
          recipients.push(assignedToId);
          triggeredBy = assignedToId;
        } else if (fullLead.createdBy) {
          // If no assignedTo, use createdBy as triggeredBy
          const createdById = (fullLead.createdBy as any)._id || fullLead.createdBy;
          triggeredBy = createdById;
          recipients.push(createdById);
        }
        
        // Also notify admins and super_admins
        const { User } = await import('../auth/auth.model');
        const adminUsers = await User.find({
          role: { $in: ['admin', 'super_admin'] },
          _id: { $nin: recipients }
        }).select('_id');
        
        adminUsers.forEach((admin: any) => {
          recipients.push(admin._id);
        });
        
        if (recipients.length === 0) {
          console.log(`⏭️ Skipping activity ${activity._id} - no recipients`);
          continue;
        }
        
        // Ensure triggeredBy is set (required field)
        if (!triggeredBy) {
          // Fallback: use first recipient as triggeredBy
          triggeredBy = recipients[0];
          console.log('⚠️ No assignedTo or createdBy found - using first recipient as triggeredBy');
        }
        
        // Format date for message
        const formattedDate = new Date(activityDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Create notification
        const notification = await NotificationService.createNotification({
          type: 'lead',
          title: `⏰ Overdue Activity: ${activityType} - ${fullLead.title}`,
          message: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} scheduled for ${formattedDate} is overdue for lead "${fullLead.title}".`,
          entityType: 'Lead',
          entityId: fullLead._id,
          triggeredBy: triggeredBy, // Now guaranteed to be set
          recipients: recipients,
          readBy: [], // Empty array - no one has read it yet
          metadata: {
            activityId: activity._id.toString(),
            activityType: activity.type,
            activityDate: activityDate,
            leadTitle: fullLead.title,
            isOverdue: true,
            overdueDate: activityDate,
          },
        });
        
        // Mark as notified in history if we found the history entry
        if (notification) {
          if (activityHistory && (activityHistory as any)._id) {
            // Mark as notified in history
            await Lead.updateOne(
              { 
                _id: fullLead._id,
                'history._id': (activityHistory as any)._id
              },
              { 
                $set: { 
                  'history.$.overdueNotificationSent': true,
                  'history.$.overdueNotificationSentAt': new Date()
                } 
              }
            );
          } else {
            // If history entry not found, create a new history entry to track this
            // This ensures we don't send duplicate notifications
            await Lead.updateOne(
              { _id: fullLead._id },
              {
                $push: {
                  history: {
                    action: 'activity_overdue_notification_sent',
                    field: 'activities',
                    changedBy: triggeredBy, // Use the same triggeredBy as notification
                    timestamp: new Date(),
                    description: `Overdue notification sent for ${activityType} scheduled for ${formattedDate}`,
                    overdueNotificationSent: true,
                    overdueNotificationSentAt: new Date(),
                  }
                }
              }
            );
          }
          
          // Access _id from notification (it's a Mongoose document)
          const notificationId = (notification as any)._id || (notification as any).id;
          console.log(`✅ Created overdue notification ${notificationId} for activity ${activity._id}`);
          console.log(`📦 Notification metadata:`, {
            isOverdue: true,
            overdueDate: activityDate,
            leadTitle: fullLead.title,
            activityType: activityType
          });
          notificationsCreated++;
        }
      }
    }
    
    console.log(`✅ Overdue activity check completed. Created ${notificationsCreated} notifications, skipped ${notificationsSkipped}`);
    
    return {
      success: true,
      leadsChecked: leadsWithOverdueActivities.length,
      notificationsCreated,
      notificationsSkipped,
    };
  } catch (error) {
    console.error('❌ Error in overdue activity service:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check if a specific activity is overdue and create notification immediately
 * This is called when a backdated activity is created
 */
export const checkAndNotifySingleOverdueActivity = async (
  leadId: string,
  activity: any
): Promise<boolean> => {
  try {
    console.log('🔍 Checking if newly created activity is overdue...');
    console.log(`📦 Lead ID: ${leadId}`);
    console.log(`📅 Activity date: ${activity.date || activity.meetingDate}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Get activity date
    const activityDate = activity.date || activity.meetingDate;
    if (!activityDate) {
      console.log('⏭️ No activity date found - skipping overdue check');
      return false;
    }
    
    const activityDateObj = new Date(activityDate);
    activityDateObj.setHours(0, 0, 0, 0);
    
    // Check if activity is overdue (date < today and not completed)
    const isOverdue = activityDateObj < today && !activity.completed;
    
    if (!isOverdue) {
      console.log('✅ Activity is not overdue - skipping notification');
      return false;
    }
    
    console.log('⏰ Activity is overdue! Creating notification...');
    
    // Get the lead document (refresh to get latest history)
    const fullLead = await Lead.findById(leadId)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('history.changedBy');
    
    if (!fullLead) {
      console.log('⏭️ Lead not found - skipping overdue notification');
      return false;
    }
    
    // Find the corresponding history entry for this activity
    // Match by: action === 'activity_added', activity type, and date
    const activityType = activity.type || 'activity';
    
    // Find the most recent activity_added history entry that matches this activity
    // Sort by timestamp descending to get the latest one first
    const activityHistoryEntries = (fullLead.history || [])
      .filter((h: any) => h.action === 'activity_added')
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Try to find matching history entry
    let activityHistory: any = null;
    for (const h of activityHistoryEntries) {
      // Check if description contains activity type
      const descriptionLower = (h.description || '').toLowerCase();
      const typeMatches = descriptionLower.includes(activityType.toLowerCase());
      
      // Check if timestamp is close to activity date (within 1 day)
      const historyDate = new Date(h.timestamp);
      historyDate.setHours(0, 0, 0, 0);
      const dateDiff = Math.abs(historyDate.getTime() - activityDateObj.getTime());
      const dateMatches = dateDiff < 24 * 60 * 60 * 1000; // Within 1 day
      
      if (typeMatches && dateMatches) {
        activityHistory = h;
        break;
      }
    }
    
    // If no matching history entry found, use the most recent activity_added entry
    // This handles the case where activity was just created and history might not be perfectly matched
    if (!activityHistory && activityHistoryEntries.length > 0) {
      // Use the most recent activity_added entry (should be the one we just created)
      activityHistory = activityHistoryEntries[0];
      console.log('⚠️ Using most recent activity_added history entry (exact match not found)');
    }
    
    // Skip if notification already sent
    if (activityHistory && (activityHistory as any).overdueNotificationSent) {
      console.log(`⏭️ Overdue notification already sent for this activity`);
      return false;
    }
    
    // Determine recipients (assigned user or createdBy if no assignedTo)
    const recipients: mongoose.Types.ObjectId[] = [];
    let triggeredBy: mongoose.Types.ObjectId | undefined;
    
    if (fullLead.assignedTo && (fullLead.assignedTo as any)._id) {
      const assignedToId = (fullLead.assignedTo as any)._id;
      recipients.push(assignedToId);
      triggeredBy = assignedToId;
    } else if (fullLead.createdBy) {
      // If no assignedTo, use createdBy as triggeredBy
      const createdById = (fullLead.createdBy as any)._id || fullLead.createdBy;
      triggeredBy = createdById;
      recipients.push(createdById);
    }
    
    // Also notify admins and super_admins
    const { User } = await import('../auth/auth.model');
    const adminUsers = await User.find({
      role: { $in: ['admin', 'super_admin'] },
      _id: { $nin: recipients }
    }).select('_id');
    
    adminUsers.forEach((admin: any) => {
      recipients.push(admin._id);
    });
    
    if (recipients.length === 0) {
      console.log(`⏭️ No recipients found - skipping overdue notification`);
      return false;
    }
    
    // Ensure triggeredBy is set (required field)
    if (!triggeredBy) {
      // Fallback: use first recipient as triggeredBy
      triggeredBy = recipients[0];
      console.log('⚠️ No assignedTo or createdBy found - using first recipient as triggeredBy');
    }
    
    // Format date for message
    const formattedDate = new Date(activityDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    // Create notification
    const notification = await NotificationService.createNotification({
      type: 'lead',
      title: `⏰ Overdue Activity: ${activityType} - ${fullLead.title}`,
      message: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} scheduled for ${formattedDate} is overdue for lead "${fullLead.title}".`,
      entityType: 'Lead',
      entityId: fullLead._id,
      triggeredBy: triggeredBy, // Now guaranteed to be set
      recipients: recipients,
      readBy: [], // Empty array - no one has read it yet
      metadata: {
        activityId: activity._id?.toString() || activity.id?.toString(),
        activityType: activity.type,
        activityDate: activityDate,
        leadTitle: fullLead.title,
        isOverdue: true,
        overdueDate: activityDate,
      },
    });
    
    // Mark as notified in history if we found the history entry
    if (notification) {
      if (activityHistory && (activityHistory as any)._id) {
        // Mark as notified in history
        await Lead.updateOne(
          { 
            _id: fullLead._id,
            'history._id': (activityHistory as any)._id
          },
          { 
            $set: { 
              'history.$.overdueNotificationSent': true,
              'history.$.overdueNotificationSentAt': new Date()
            } 
          }
        );
      } else {
        // If history entry not found, create a new history entry to track this
        await Lead.updateOne(
          { _id: fullLead._id },
          {
                $push: {
                  history: {
                    action: 'activity_overdue_notification_sent',
                    field: 'activities',
                    changedBy: triggeredBy, // Use the same triggeredBy as notification
                    timestamp: new Date(),
                    description: `Overdue notification sent for ${activityType} scheduled for ${formattedDate}`,
                    overdueNotificationSent: true,
                    overdueNotificationSentAt: new Date(),
                  }
                }
              }
            );
          }
          
          const notificationId = (notification as any)._id || (notification as any).id;
          console.log(`✅ Created overdue notification ${notificationId} for activity immediately`);
          console.log(`📦 Notification metadata:`, {
            isOverdue: true,
            overdueDate: activityDate,
            leadTitle: fullLead.title,
            activityType: activityType
          });
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('❌ Error checking single overdue activity:', error);
        return false;
      }
    };

/**
 * Initialize cron job to check for overdue activities daily at 10:00 AM
 * Cron pattern: "0 10 * * *" means:
 * - 0: minute 0
 * - 10: hour 10 (10:00 AM)
 * - *: every day of the month
 * - *: every month
 * - *: every day of the week
 */
export const initializeOverdueActivityChecker = () => {
  // Import cron at runtime to avoid issues
  import('node-cron').then((cron) => {
    // Run daily at 10:00 AM
    cron.default.schedule('0 10 * * *', async () => {
      console.log('⏰ Running scheduled overdue activity check...');
      await checkAndNotifyOverdueActivities();
    });
    
    console.log('✅ Overdue activity checker cron job initialized (runs daily at 10:00 AM)');
  }).catch((error) => {
    console.error('❌ Failed to initialize overdue activity checker cron job:', error);
  });
};

