import cron from 'node-cron';
import { Lead } from '../lead/lead.model';
import { Notification } from './notification.model';
import mongoose from 'mongoose';

/**
 * Service to send notifications 1 day before activities are due
 * Runs daily at 9:00 AM to check for activities due tomorrow
 */

// Function to check and create reminders for activities due tomorrow
export const checkAndSendActivityReminders = async () => {
  try {
    console.log('Running activity reminder check...');
    
    // Calculate tomorrow's date (start and end of the day)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    dayAfterTomorrow.setHours(0, 0, 0, 0); // Start of day after tomorrow
    
    // Find all leads with activities scheduled for tomorrow
    const leadsWithActivitiesDueTomorrow = await Lead.find({
      activities: {
        $elemMatch: {
          date: {
            $gte: tomorrow,
            $lt: dayAfterTomorrow,
          },
          completed: false, // Only uncompleted activities
        },
      },
    }).populate('assignedTo', 'name email');
    
    console.log(`Found ${leadsWithActivitiesDueTomorrow.length} leads with activities due tomorrow`);
    
    // Create notifications for each activity
    let notificationsCreated = 0;
    
    for (const lead of leadsWithActivitiesDueTomorrow) {
      if (!lead.activities || lead.activities.length === 0) continue;
      
      // Filter activities due tomorrow
      const activitiesDueTomorrow = lead.activities.filter((activity: any) => {
        const activityDate = new Date(activity.date);
        activityDate.setHours(0, 0, 0, 0);
        return (
          activityDate >= tomorrow &&
          activityDate < dayAfterTomorrow &&
          !activity.completed
        );
      });
      
      // Create a notification for each activity
      for (const activity of activitiesDueTomorrow) {
        // Check if a reminder notification already exists for this activity
        const existingNotification = await Notification.findOne({
          entityType: 'Lead',
          entityId: lead._id,
          type: 'lead',
          'metadata.activityId': activity._id,
          'metadata.isReminder': true,
        });
        
        if (existingNotification) {
          console.log(`Reminder already exists for activity ${activity._id}`);
          continue; // Skip if reminder already sent
        }
        
        // Determine recipients (assigned user)
        const recipients: mongoose.Types.ObjectId[] = [];
        if (lead.assignedTo && lead.assignedTo._id) {
          recipients.push(lead.assignedTo._id);
        }
        
        // Skip if no recipients
        if (recipients.length === 0) continue;
        
        // Format the activity date
        const activityDate = new Date(activity.date);
        const formattedDate = activityDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        
        // Create notification
        const notification = await Notification.create({
          type: 'lead',
          title: `Activity Reminder: ${activity.type} - ${lead.title}`,
          message: `You have a ${activity.type} activity scheduled for tomorrow (${formattedDate}) for lead "${lead.title}".`,
          entityType: 'Lead',
          entityId: lead._id,
          triggeredBy: lead.assignedTo?._id || lead.assignedTo, // Self-reminder
          recipients: recipients,
          metadata: {
            activityId: activity._id,
            activityType: activity.type,
            activityDate: activity.date,
            leadTitle: lead.title,
            isReminder: true, // Flag to identify reminder notifications
            reminderSentAt: new Date(),
          },
        });
        
        console.log(`Created reminder notification ${notification._id} for activity ${activity._id}`);
        notificationsCreated++;
      }
    }
    
    console.log(`Activity reminder check completed. Created ${notificationsCreated} notifications.`);
    
    return {
      success: true,
      leadsChecked: leadsWithActivitiesDueTomorrow.length,
      notificationsCreated,
    };
  } catch (error) {
    console.error('Error in activity reminder service:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Initialize the cron job to run daily at 9:00 AM
 * Cron pattern: "0 9 * * *" means:
 * - 0: minute 0
 * - 9: hour 9 (9:00 AM)
 * - *: every day of the month
 * - *: every month
 * - *: every day of the week
 */
export const initializeActivityReminderCron = () => {
  // Schedule the job to run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Cron job triggered: Checking for activities due tomorrow...');
    await checkAndSendActivityReminders();
  });
  
  console.log('Activity reminder cron job initialized. Will run daily at 9:00 AM.');
  
  // Optional: Run once immediately on startup (for testing)
  // Uncomment the line below to test immediately when server starts
  // checkAndSendActivityReminders();
};

/**
 * Manual trigger function for testing purposes
 * Can be called from an API endpoint to test the reminder system
 */
export const triggerActivityReminderCheck = async () => {
  console.log('Manual trigger: Checking for activities due tomorrow...');
  return await checkAndSendActivityReminders();
};
