import nodemailer from 'nodemailer';
import config from '../../../config';
import { Lead } from '../lead/lead.model';
import { StandaloneActivity } from '../standaloneActivity/standaloneActivity.model';
import { Notification } from './notification.model';
import { NotificationService } from './notification.service';
import mongoose from 'mongoose';

/**
 * Email template for overdue activities
 */
const overdueActivityEmailTemplate = (data: {
  userName: string;
  activities: Array<{
    type: string;
    date: Date;
    leadTitle?: string;
    leadName?: string;
    isStandalone: boolean;
  }>;
  overdueCount: number;
}) => {
  const activitiesList = data.activities.map(activity => {
    const formattedDate = new Date(activity.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    
    if (activity.isStandalone) {
      return `
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 4px;">
          <div style="font-weight: bold; color: #856404; text-transform: capitalize;">
            ${activity.type} Activity (Standalone)
          </div>
          <div style="color: #856404; margin-top: 5px;">
            📅 Due: ${formattedDate}
          </div>
        </div>
      `;
    } else {
      return `
        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 10px 0; border-radius: 4px;">
          <div style="font-weight: bold; color: #721c24; text-transform: capitalize;">
            ${activity.type} Activity
          </div>
          <div style="color: #721c24; margin-top: 5px;">
            📋 Lead: ${activity.leadTitle || 'Unknown'}
            ${activity.leadName ? ` (${activity.leadName})` : ''}
          </div>
          <div style="color: #721c24; margin-top: 5px;">
            📅 Due: ${formattedDate}
          </div>
        </div>
      `;
    }
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .count-badge { display: inline-block; padding: 8px 16px; background: #dc3545; color: white; border-radius: 20px; font-size: 18px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Overdue Activities Alert</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${data.userName}</strong>,</p>
          <p>You have <span class="count-badge">${data.overdueCount}</span> overdue ${data.overdueCount === 1 ? 'activity' : 'activities'} that require your attention.</p>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #dc3545;">Overdue Activities:</h3>
            ${activitiesList}
          </div>
          
          <p>Please log in to your dashboard to address these overdue items as soon as possible.</p>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>CRM Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send overdue activity email
 */
const sendOverdueActivityEmail = async (
  to: string,
  userName: string,
  activities: Array<{
    type: string;
    date: Date;
    leadTitle?: string;
    leadName?: string;
    isStandalone: boolean;
  }>
): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    const html = overdueActivityEmailTemplate({
      userName,
      activities,
      overdueCount: activities.length,
    });

    await transporter.sendMail({
      from: `"CRM System" <${config.email.user}>`,
      to,
      subject: `⚠️ Overdue Activities Alert: ${activities.length} ${activities.length === 1 ? 'Activity' : 'Activities'}`,
      html,
    });

    console.log(`✅ Overdue activity email sent to ${to}`);
  } catch (error) {
    console.error('❌ Error sending overdue activity email:', error);
    // Don't throw error - we don't want to break the main flow if email fails
  }
};

/**
 * Check and notify overdue lead activities
 * This includes sending emails to admins, super admins, and assigned person
 */
export const checkAndNotifyOverdueLeadActivities = async () => {
  try {
    console.log('🔍 Running overdue lead activity check...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Find all leads with uncompleted activities that are overdue (date < today)
    const leadsWithOverdueActivities = await Lead.aggregate([
      {
        $match: {
          'activities': { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$activities'
      },
      {
        $match: {
          'activities.completed': false,
          $or: [
            { 'activities.date': { $exists: true, $lt: today } },
            { 'activities.meetingDate': { $exists: true, $lt: today } }
          ]
        }
      },
      {
        $group: {
          _id: '$_id',
          lead: { $first: '$$ROOT' },
          overdueActivities: { $push: '$activities' }
        }
      },
      {
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
    let emailsSent = 0;
    
    // Get admins and super admins
    const { User } = await import('../auth/auth.model');
    const adminUsers = await User.find({
      role: { $in: ['admin', 'super_admin'] }
    }).select('_id name email');
    
    // Group activities by user for email sending
    const userActivitiesMap = new Map<string, Array<any>>();
    
    // Process each lead with overdue activities
    for (const item of leadsWithOverdueActivities) {
      const lead = item.lead;
      const overdueActivities = item.overdueActivities;
      const assignedToUser = item.assignedToUser?.[0];
      
      if (!assignedToUser) {
        console.log(`⏭️ Skipping lead ${lead._id} - no assigned user`);
        continue;
      }
      
      // Get the full lead document
      const fullLead = await Lead.findById(lead._id)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email');
      
      if (!fullLead) continue;
      
      // Add to assigned user's activity list
      const assignedUserId = assignedToUser._id.toString();
      if (!userActivitiesMap.has(assignedUserId)) {
        userActivitiesMap.set(assignedUserId, []);
      }
      
      // Process each overdue activity
      for (const activity of overdueActivities) {
        const activityDate = activity.date || activity.meetingDate;
        const activityType = activity.type || 'activity';
        
        // Add to user's activity list for email
        userActivitiesMap.get(assignedUserId)?.push({
          type: activityType,
          date: activityDate,
          leadTitle: fullLead.title,
          leadName: fullLead.name,
          isStandalone: false,
        });
        
        // Determine recipients for notification
        const recipients: mongoose.Types.ObjectId[] = [assignedToUser._id];
        adminUsers.forEach((admin: any) => {
          if (admin._id.toString() !== assignedUserId) {
            recipients.push(admin._id);
          }
        });
        
        // Format date for message
        const formattedDate = new Date(activityDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Create notification
        await NotificationService.createNotification({
          type: 'lead',
          title: `⏰ Overdue Activity: ${activityType} - ${fullLead.title}`,
          message: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} scheduled for ${formattedDate} is overdue for lead "${fullLead.title}".`,
          entityType: 'Lead',
          entityId: fullLead._id,
          triggeredBy: assignedToUser._id,
          recipients: recipients,
          readBy: [],
          metadata: {
            activityId: activity._id.toString(),
            activityType: activity.type,
            activityDate: activityDate,
            leadTitle: fullLead.title,
            isOverdue: true,
            overdueDate: activityDate,
          },
        });
        
        notificationsCreated++;
      }
    }
    
    // Send emails to assigned users
    for (const [userId, activities] of userActivitiesMap.entries()) {
      const { User } = await import('../auth/auth.model');
      const user = await User.findById(userId).select('name email');
      
      if (user && user.email && activities.length > 0) {
        await sendOverdueActivityEmail(user.email, user.name, activities);
        emailsSent++;
      }
    }
    
    console.log(`✅ Overdue lead activity check completed. Created ${notificationsCreated} notifications, sent ${emailsSent} emails`);
    
    return {
      success: true,
      notificationsCreated,
      emailsSent,
    };
  } catch (error) {
    console.error('❌ Error in overdue lead activity service:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check and notify overdue standalone activities
 * This includes sending emails to admins, super admins, and creator
 */
export const checkAndNotifyOverdueStandaloneActivities = async () => {
  try {
    console.log('🔍 Running overdue standalone activity check...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Find all uncompleted standalone activities that are overdue (date < today)
    const overdueActivities = await StandaloneActivity.find({
      completed: false,
      date: { $lt: today }
    })
      .populate('addedBy', 'name email')
      .lean();
    
    console.log(`📊 Found ${overdueActivities.length} overdue standalone activities`);
    
    if (overdueActivities.length === 0) {
      return {
        success: true,
        notificationsCreated: 0,
        emailsSent: 0,
      };
    }
    
    let notificationsCreated = 0;
    let emailsSent = 0;
    
    // Get admins and super admins
    const { User } = await import('../auth/auth.model');
    const adminUsers = await User.find({
      role: { $in: ['admin', 'super_admin'] }
    }).select('_id name email');
    
    // Group activities by user (creator) for email sending
    const userActivitiesMap = new Map<string, Array<any>>();
    
    // Process each overdue standalone activity
    for (const activity of overdueActivities) {
      const addedBy = activity.addedBy as any;
      
      if (!addedBy) {
        console.log(`⏭️ Skipping standalone activity ${activity._id} - no creator`);
        continue;
      }
      
      const creatorId = addedBy._id.toString();
      
      // Add to creator's activity list
      if (!userActivitiesMap.has(creatorId)) {
        userActivitiesMap.set(creatorId, []);
      }
      
      userActivitiesMap.get(creatorId)?.push({
        type: activity.type,
        date: activity.date,
        isStandalone: true,
      });
      
      // Determine recipients for notification (creator + admins)
      const recipients: mongoose.Types.ObjectId[] = [addedBy._id];
      adminUsers.forEach((admin: any) => {
        if (admin._id.toString() !== creatorId) {
          recipients.push(admin._id);
        }
      });
      
      // Format date for message
      const formattedDate = new Date(activity.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      // Create notification
      await NotificationService.createNotification({
        type: 'system',
        title: `⏰ Overdue Standalone Activity: ${activity.type}`,
        message: `Your ${activity.type} activity scheduled for ${formattedDate} is overdue.`,
        entityType: 'Task',
        entityId: activity._id as any,
        triggeredBy: addedBy._id,
        recipients: recipients,
        readBy: [],
        metadata: {
          activityId: activity._id.toString(),
          activityType: activity.type,
          activityDate: activity.date,
          isStandalone: true,
          isOverdue: true,
          overdueDate: activity.date,
        },
      });
      
      notificationsCreated++;
    }
    
    // Send emails to creators
    for (const [userId, activities] of userActivitiesMap.entries()) {
      const { User } = await import('../auth/auth.model');
      const user = await User.findById(userId).select('name email');
      
      if (user && user.email && activities.length > 0) {
        await sendOverdueActivityEmail(user.email, user.name, activities);
        emailsSent++;
      }
    }
    
    // Also send summary email to all admins if there are overdue activities
    if (overdueActivities.length > 0) {
      // Group all activities for admin summary
      const allActivities = overdueActivities.map(activity => ({
        type: activity.type,
        date: activity.date,
        isStandalone: true,
      }));
      
      for (const admin of adminUsers) {
        if (admin.email) {
          await sendOverdueActivityEmail(
            admin.email,
            admin.name,
            allActivities
          );
          emailsSent++;
        }
      }
    }
    
    console.log(`✅ Overdue standalone activity check completed. Created ${notificationsCreated} notifications, sent ${emailsSent} emails`);
    
    return {
      success: true,
      notificationsCreated,
      emailsSent,
    };
  } catch (error) {
    console.error('❌ Error in overdue standalone activity service:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Combined function to check all overdue activities (both lead and standalone)
 */
export const checkAndNotifyAllOverdueActivities = async () => {
  try {
    console.log('🔍 Running combined overdue activity check...');
    
    const [leadResult, standaloneResult] = await Promise.all([
      checkAndNotifyOverdueLeadActivities(),
      checkAndNotifyOverdueStandaloneActivities(),
    ]);
    
    const totalNotifications = 
      (leadResult.notificationsCreated || 0) + 
      (standaloneResult.notificationsCreated || 0);
    
    const totalEmails = 
      (leadResult.emailsSent || 0) + 
      (standaloneResult.emailsSent || 0);
    
    console.log(`✅ Combined overdue activity check completed.`);
    console.log(`   Total notifications: ${totalNotifications}`);
    console.log(`   Total emails sent: ${totalEmails}`);
    
    return {
      success: true,
      leadActivities: leadResult,
      standaloneActivities: standaloneResult,
      totals: {
        notificationsCreated: totalNotifications,
        emailsSent: totalEmails,
      },
    };
  } catch (error) {
    console.error('❌ Error in combined overdue activity check:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Initialize cron job to check for overdue activities daily at 9:00 AM
 * This will check both lead activities and standalone activities
 */
export const initializeOverdueActivityEmailCron = () => {
  import('node-cron').then((cron) => {
    // Run daily at 9:00 AM
    cron.default.schedule('0 9 * * *', async () => {
      console.log('⏰ Running scheduled overdue activity check with email notifications...');
      await checkAndNotifyAllOverdueActivities();
    });
    
    console.log('✅ Overdue activity email cron job initialized (runs daily at 9:00 AM)');
  }).catch((error) => {
    console.error('❌ Failed to initialize overdue activity email cron job:', error);
  });
};
