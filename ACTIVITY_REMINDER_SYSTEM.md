# Activity Reminder Notification System

## Overview
Automated notification system that sends reminders to users **1 day before** their scheduled activities are due. This helps ensure important activities like calls, meetings, emails, and custom tasks are not forgotten.

## Features

### ✅ Automated Daily Checks
- Runs automatically every day at **9:00 AM**
- Checks for all uncompleted activities scheduled for the next day
- Creates notifications for assigned users

### ✅ Smart Notification Creation
- Only creates notifications for **uncompleted activities**
- Prevents duplicate reminders (checks if notification already sent)
- Includes activity details (type, date, lead title)
- Supports all activity types: `call`, `meeting`, `email`, `custom`

### ✅ Targeted Delivery
- Sends notifications only to the **assigned representative**
- Notifications appear in the user's notification dropdown
- Real-time delivery via Socket.IO

## Technical Implementation

### File Structure
```
backend/src/app/modules/notification/
├── activityReminderService.ts  # Cron job service
├── notification.controller.ts   # Added triggerReminderCheck endpoint
├── notification.route.ts        # Added test endpoint
└── notification.model.ts        # Existing notification model
```

### Cron Schedule
```javascript
// Runs daily at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  await checkAndSendActivityReminders();
});
```

**Cron Pattern Breakdown:**
- `0` = Minute 0
- `9` = Hour 9 (9:00 AM)
- `*` = Every day of month
- `*` = Every month
- `*` = Every day of week

### How It Works

1. **Daily Check (9:00 AM)**
   ```
   Server → Cron Job → Check for activities due tomorrow
   ```

2. **Activity Detection**
   ```
   Database Query → Find leads with activities due tomorrow
   Filter → Only uncompleted activities
   ```

3. **Notification Creation**
   ```
   For each activity:
   ├─ Check if reminder already sent
   ├─ Get assigned user
   ├─ Create notification
   └─ Send via Socket.IO
   ```

4. **Notification Details**
   ```json
   {
     "type": "lead",
     "title": "Activity Reminder: call - Tech Corp Lead",
     "message": "You have a call activity scheduled for tomorrow (Oct 30, 2025) for lead \"Tech Corp Lead\".",
     "entityType": "Lead",
     "entityId": "leadId",
     "metadata": {
       "activityId": "activityId",
       "activityType": "call",
       "activityDate": "2025-10-30",
       "leadTitle": "Tech Corp Lead",
       "isReminder": true,
       "reminderSentAt": "2025-10-29T09:00:00Z"
     }
   }
   ```

## API Endpoints

### Manual Trigger (Testing Only)
```http
POST /api/v1/notifications/trigger-reminder-check
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Reminder check completed. 5 notifications created.",
  "data": {
    "success": true,
    "leadsChecked": 12,
    "notificationsCreated": 5
  }
}
```

**Access:** Admin and Super Admin only

## Configuration

### Change Cron Schedule
Edit `activityReminderService.ts`:

```typescript
// Current: 9:00 AM daily
cron.schedule('0 9 * * *', async () => { ... });

// Examples:
// 8:00 AM daily
cron.schedule('0 8 * * *', async () => { ... });

// 6:00 PM daily
cron.schedule('0 18 * * *', async () => { ... });

// Twice daily (9 AM and 6 PM)
cron.schedule('0 9,18 * * *', async () => { ... });

// Every Monday at 9 AM
cron.schedule('0 9 * * 1', async () => { ... });
```

### Test Immediately on Startup
Uncomment this line in `activityReminderService.ts`:
```typescript
export const initializeActivityReminderCron = () => {
  cron.schedule('0 9 * * *', async () => { ... });
  
  // Uncomment to test immediately when server starts:
  checkAndSendActivityReminders();
};
```

## Database Schema

### Activity Schema (in Lead Model)
```typescript
activities: [
  {
    type: String,        // 'call', 'meeting', 'email', 'custom'
    date: Date,          // Activity due date
    completed: Boolean,  // Completion status
    // ... other fields
  }
]
```

### Notification Metadata
```typescript
metadata: {
  activityId: ObjectId,      // Reference to activity
  activityType: String,      // Type of activity
  activityDate: Date,        // When activity is due
  leadTitle: String,         // Lead title for context
  isReminder: Boolean,       // Flag: true for reminder notifications
  reminderSentAt: Date       // When reminder was sent
}
```

## Deployment Considerations

### Production Checklist
- ✅ Cron job runs in server timezone
- ✅ Handle timezone differences for global teams
- ✅ Monitor notification delivery success
- ✅ Set up logging for cron execution
- ✅ Consider server restart behavior

### Scaling
- Multiple server instances: Use external scheduler (e.g., AWS EventBridge)
- High volume: Consider background job queue (Bull, Agenda)
- Database load: Add indexes on activity dates

### Monitoring
Check server logs for:
```
Activity reminder cron job initialized. Will run daily at 9:00 AM.
Cron job triggered: Checking for activities due tomorrow...
Found 12 leads with activities due tomorrow
Created reminder notification 67210abc... for activity 67210def...
Activity reminder check completed. Created 5 notifications.
```

## Testing

### Manual Testing
1. **Create test activities for tomorrow:**
   ```javascript
   // In leads, add activities with date = tomorrow
   {
     type: 'call',
     date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
     completed: false
   }
   ```

2. **Trigger reminder check:**
   ```bash
   curl -X POST http://localhost:5000/api/v1/notifications/trigger-reminder-check \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

3. **Check notifications:**
   ```bash
   curl http://localhost:5000/api/v1/notifications \
     -H "Authorization: Bearer YOUR_USER_TOKEN"
   ```

### Expected Behavior
- ✅ Notifications created for activities due tomorrow
- ✅ No duplicates (run twice, only creates once)
- ✅ Only for uncompleted activities
- ✅ Only for assigned users
- ❌ No notifications for past activities
- ❌ No notifications for activities due today
- ❌ No notifications for completed activities

## Troubleshooting

### No notifications created
1. Check if activities exist with `date = tomorrow`
2. Verify activities are not marked as `completed: true`
3. Check if leads have `assignedTo` field populated
4. Look for existing notifications (no duplicates)

### Notifications not appearing in UI
1. Verify Socket.IO connection
2. Check user ID matches notification recipient
3. Ensure notification slice is updated in Redux

### Cron not running
1. Check server logs for initialization message
2. Verify node-cron package installed
3. Ensure server timezone is correct

## Future Enhancements
- [ ] Configurable reminder timing (1 day, 2 days, 1 week)
- [ ] Multiple reminder notifications per activity
- [ ] Email notifications for reminders
- [ ] User preference settings (enable/disable reminders)
- [ ] Reminder for tasks with due dates
- [ ] Digest notifications (daily summary)

## Dependencies
```json
{
  "node-cron": "^3.x.x",
  "@types/node-cron": "^3.x.x"
}
```

## Related Files
- `/backend/src/server.ts` - Cron initialization
- `/backend/src/app/modules/notification/*` - Notification system
- `/backend/src/app/modules/lead/lead.model.ts` - Activity schema
- `/CRM-DPX-Client/components/dashboard-layout.tsx` - Notification UI

---

**Last Updated:** October 29, 2025  
**Version:** 1.0.0  
**Author:** CRM Development Team
