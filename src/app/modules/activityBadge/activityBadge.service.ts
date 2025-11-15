import mongoose from 'mongoose';
import { ActivityBadge } from './activityBadge.model';
import { Lead } from '../lead/lead.model';
import { User } from '../auth/auth.model';

// Helper function to get today's date string (YYYY-MM-DD)
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's activities count for a user
export const getTodaysActivitiesCount = async (userId: string, userRole?: string): Promise<number> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build query based on user role
    // Admins see all activities, representatives see only their assigned/created leads
    let query: any = {};
    
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      // For representatives, only show activities from their assigned or created leads
      query = {
        $or: [
          { assignedTo: userId },
        ]
      };
    }
    // For admins, query is empty (shows all leads)

    // Find leads based on query
    const leads = await Lead.find(query).select('activities');

    let count = 0;
    
    leads.forEach(lead => {
      if (lead.activities && lead.activities.length > 0) {
        lead.activities.forEach((activity: any) => {
          // Skip completed activities
          if (activity.completed) {
            return;
          }

          // Get activity date (for meeting, use meetingDate if available)
          const activityDate = activity.type === 'meeting' && activity.meetingDate 
            ? new Date(activity.meetingDate)
            : new Date(activity.date);

          // Check if activity is for today
          activityDate.setHours(0, 0, 0, 0);
          
          if (activityDate.getTime() === today.getTime()) {
            count++;
          }
        });
      }
    });

    // Only log if count > 0 to reduce noise
    if (count > 0) {
      console.log(`📊 Today's activities count for user ${userId} (role: ${userRole}): ${count}`);
    }
    return count;
  } catch (error) {
    console.error('Error getting today\'s activities count:', error);
    return 0;
  }
};

// Get badge status for a user (count + viewed status)
export const getActivityBadgeStatus = async (userId: string, userRole?: string): Promise<{
  count: number;
  shouldShow: boolean;
  viewed: boolean;
}> => {
  try {
    const date = getTodayDateString();
    
    // Get or create badge record
    let badge = await ActivityBadge.findOne({ userId, date });
    
    // Count today's activities (pass userRole to handle admin vs representative)
    const count = await getTodaysActivitiesCount(userId, userRole);
    
    if (!badge) {
      // Create new badge record if it doesn't exist
      badge = await ActivityBadge.create({
        userId: new mongoose.Types.ObjectId(userId),
        date,
        viewed: false,
        count,
      });
      console.log(`✅ Created new activity badge for user ${userId}: count=${count}, viewed=false`);
    } else {
      // Always update count to latest value (even if same, to ensure accuracy)
      const oldCount = badge.count || 0;
      badge.count = count;
      
      // If count increased and badge was viewed, reset viewed status
      // This allows badge to show again when new activities are added
      if (count > oldCount && badge.viewed) {
        badge.viewed = false;
        badge.lastViewedAt = undefined;
        console.log(`🔄 Badge count increased (${oldCount} → ${count}), resetting viewed status`);
      }
      
      // Always save to ensure count is up-to-date
      await badge.save();
    }

    // Badge should show if: count > 0 AND not viewed
    const shouldShow = count > 0 && !badge.viewed;

    // Only log if badge should show or count changed to reduce noise
    if (shouldShow || count > 0) {
      console.log(`📊 Badge status for user ${userId} (role: ${userRole}): count=${count}, viewed=${badge.viewed}, shouldShow=${shouldShow}`);
      console.log(`   Date: ${date}, Badge ID: ${badge._id}`);
    }

    return {
      count,
      shouldShow,
      viewed: badge.viewed || false,
    };
  } catch (error) {
    console.error('Error getting activity badge status:', error);
    return {
      count: 0,
      shouldShow: false,
      viewed: false,
    };
  }
};

// Mark badge as viewed
export const markActivityBadgeAsViewed = async (userId: string): Promise<boolean> => {
  try {
    const date = getTodayDateString();
    
    const badge = await ActivityBadge.findOneAndUpdate(
      { userId, date },
      {
        viewed: true,
        lastViewedAt: new Date(),
      },
      {
        upsert: true, // Create if doesn't exist
        new: true,
      }
    );

    if (badge) {
      console.log(`✅ Activity badge marked as viewed for user ${userId} on ${date}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error marking activity badge as viewed:', error);
    return false;
  }
};

// Reset viewed status when new activity is added for today
// This should be called for all users who might see this activity (assignedTo, createdBy, admins)
export const resetActivityBadgeForNewActivity = async (
  userIds: string[],
  activityDate: Date
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activityDateOnly = new Date(activityDate);
    activityDateOnly.setHours(0, 0, 0, 0);

    // Only reset if activity is for today
    if (activityDateOnly.getTime() === today.getTime()) {
      const date = getTodayDateString();
      
      // Reset viewed status and update count for all affected users
      const updatePromises = userIds.map(async (userId) => {
        // Get user role to determine if they're admin (see all activities)
        const user = await User.findById(userId).select('role');
        const userRole = user?.role;
        
        // First, get the current count for this user (pass role for admin handling)
        const currentCount = await getTodaysActivitiesCount(userId, userRole);
        
        // Update badge: reset viewed status and update count
        const updated = await ActivityBadge.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId), date },
          {
            $set: {
              viewed: false,
              lastViewedAt: undefined,
              count: currentCount, // Update count to reflect new activity
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
        
        console.log(`   User ${userId} (${userRole}): count=${currentCount}, viewed=false`);
        return updated;
      });

      await Promise.all(updatePromises);

      console.log(`🔄 Activity badge reset for ${userIds.length} user(s) due to new activity on ${date}`);
      console.log(`   User IDs: ${userIds.join(', ')}`);
    }
  } catch (error) {
    console.error('Error resetting activity badge for new activity:', error);
  }
};

// Reset all badges for a specific date (for cron job)
export const resetActivityBadgesForDate = async (date: string): Promise<number> => {
  try {
    const result = await ActivityBadge.updateMany(
      { date },
      {
        viewed: false,
        lastViewedAt: undefined,
      }
    );

    console.log(`🔄 Reset ${result.modifiedCount} activity badges for date ${date}`);
    return result.modifiedCount || 0;
  } catch (error) {
    console.error('Error resetting activity badges for date:', error);
    return 0;
  }
};

// Daily cron job: Reset all badges for today (should run at start of day)
export const initializeActivityBadgeCron = (): void => {
  // Import cron at runtime to avoid issues
  import('node-cron').then((cron) => {
    // Run daily at 00:01 AM (1 minute after midnight) to reset badges for the new day
    cron.default.schedule('1 0 * * *', async () => {
      console.log('⏰ Running daily activity badge reset...');
      const date = getTodayDateString();
      const count = await resetActivityBadgesForDate(date);
      console.log(`✅ Daily reset: Cleared ${count} activity badge viewed status for ${date}`);
      
      // Emit socket event to refresh activity badge for all users
      try {
        const { getIO } = await import('../socket/socketService');
        const io = getIO();
        
        // Get all users to emit badge refresh event
        const { User } = await import('../auth/auth.model');
        const allUsers = await User.find({}).select('_id');
        
        // Emit activityBadgeRefresh event to all users
        allUsers.forEach((user: any) => {
          const userId = user._id.toString();
          const userRoom = `user_${userId}`;
          io.to(userRoom).emit('activityBadgeRefresh', {
            userId,
            date,
            timestamp: new Date().toISOString(),
          });
        });
        
        console.log(`📢 Emitted activityBadgeRefresh to ${allUsers.length} user(s) via cron job`);
      } catch (socketError) {
        console.error('❌ Error emitting activityBadgeRefresh socket event from cron:', socketError);
      }
    });
    
    console.log('✅ Activity badge cron job initialized (runs daily at 00:01 AM)');
  }).catch((error) => {
    console.error('❌ Failed to initialize activity badge cron job:', error);
  });
};

// Get all users who should see badge (for notifications)
export const getUsersWithTodaysActivities = async (): Promise<string[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all leads with activities for today
    const leads = await Lead.find({
      activities: {
        $elemMatch: {
          date: {
            $gte: today,
            $lt: tomorrow,
          },
          completed: false,
        },
      },
    }).select('assignedTo createdBy');

    const userIds = new Set<string>();

    leads.forEach(lead => {
      // Add assigned user
      if (lead.assignedTo) {
        const assignedToId = typeof lead.assignedTo === 'string' 
          ? lead.assignedTo 
          : (lead.assignedTo as any)._id?.toString();
        if (assignedToId) {
          userIds.add(assignedToId);
        }
      }

      // Add creator
      if (lead.createdBy) {
        const createdById = typeof lead.createdBy === 'string'
          ? lead.createdBy
          : (lead.createdBy as any)._id?.toString();
        if (createdById) {
          userIds.add(createdById);
        }
      }
    });

    return Array.from(userIds);
  } catch (error) {
    console.error('Error getting users with today\'s activities:', error);
    return [];
  }
};

