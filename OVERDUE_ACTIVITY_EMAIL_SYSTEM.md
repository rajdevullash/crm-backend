# Overdue Activity Email Notification System

## Overview
Implemented a comprehensive email notification system that checks for overdue activities daily and sends email alerts to admins, super admins, and assigned/creator persons.

## Features

### 1. **Checks Both Activity Types**
   - ✅ **Lead Activities** - Activities associated with leads
   - ✅ **Standalone Activities** - Independent activities created by users

### 2. **Email Recipients**
   For each overdue activity, emails are sent to:
   - 🔹 **Super Admin** - Always notified of all overdue activities
   - 🔹 **Admin** - Always notified of all overdue activities  
   - 🔹 **Assigned Person** (for lead activities) - User who is assigned to the lead
   - 🔹 **Creator** (for standalone activities) - User who created the activity

### 3. **Dual Notification System**
   - 📧 **Email Notifications** - Beautiful HTML emails with activity details
   - 🔔 **In-App Notifications** - Notifications in the CRM dashboard

### 4. **Automated Daily Checks**
   - ⏰ Runs automatically every day at **9:00 AM**
   - Uses cron job scheduling (`0 9 * * *`)
   - Checks all uncompleted activities with dates before today

## Files Created/Modified

### New File Created:
✅ **`/backend/src/app/modules/notification/overdueActivityEmailService.ts`**
   - Complete email notification service for overdue activities
   - Handles both lead and standalone activities
   - Beautiful HTML email templates
   - Groups activities by user to avoid email spam
   - Comprehensive error handling

### Modified Files:
✅ **`/backend/src/server.ts`**
   - Added import for `initializeOverdueActivityEmailCron`
   - Initialized the cron job on server startup

## How It Works

### Daily Process Flow:

1. **9:00 AM Daily** - Cron job triggers automatically

2. **Check Lead Activities**
   - Queries all leads with uncompleted activities
   - Filters activities where `date < today`
   - Groups by assigned user

3. **Check Standalone Activities**
   - Queries all standalone activities
   - Filters uncompleted activities where `date < today`
   - Groups by creator

4. **Send Notifications**
   - Creates in-app notifications for all recipients
   - Sends email to each affected user with their overdue activities
   - Sends summary email to all admins/super admins

5. **Prevent Duplicates**
   - Tracks activities already notified
   - Won't send duplicate emails for same activity

## Email Template Features

The email includes:
- 📊 **Count Badge** - Shows total number of overdue activities
- 📋 **Activity List** - Each activity displayed with:
  - Activity type (Call, Meeting, Email, Custom)
  - Due date
  - Lead information (if applicable)
  - Standalone indicator (if applicable)
- 🎨 **Color Coding**:
  - Red background for lead activities
  - Yellow background for standalone activities
- 📱 **Responsive Design** - Looks good on all devices

## Configuration

### Cron Schedule:
- **Current**: Runs daily at 9:00 AM
- **Pattern**: `0 9 * * *`
- **To Change**: Edit the cron pattern in `overdueActivityEmailService.ts` line ~478

### Email Settings:
Uses existing email configuration from `config.email`:
- SMTP Host: smtp.gmail.com
- Port: 587
- Credentials from environment variables

## Testing

### Manual Test:
You can manually trigger the check by calling the function:
```typescript
import { checkAndNotifyAllOverdueActivities } from './overdueActivityEmailService';
await checkAndNotifyAllOverdueActivities();
```

### Check Logs:
The service logs detailed information:
- 🔍 When checks start
- 📊 Number of overdue activities found
- ✅ Notifications and emails sent
- ❌ Any errors encountered

## What Wasn't Deleted

✅ **All existing code preserved**
- Original `overdueActivityService.ts` - Still handles in-app notifications only
- All other notification services intact
- No breaking changes to existing functionality

## Added Benefits

1. **Email Alerts** - Users get notified even if they don't check the dashboard
2. **Better Visibility** - Admins can track all overdue items across the system
3. **Standalone Activity Support** - Previously only lead activities were checked
4. **Grouped Emails** - Each user gets one email with all their overdue items
5. **Professional Templates** - Beautiful HTML emails with clear formatting

## Next Steps

The system is ready to use! It will automatically:
- ✅ Start checking at 9:00 AM daily when the server restarts
- ✅ Send emails to all relevant parties
- ✅ Create in-app notifications
- ✅ Track all overdue activities

Simply restart your backend server to activate the cron job.
