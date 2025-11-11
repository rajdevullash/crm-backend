import mongoose from 'mongoose';
import app from './app';
import config from './config';
import http from 'http';
import { initializeSocket } from './app/modules/socket/socketService';
import { initializeActivityReminderCron } from './app/modules/notification/activityReminderService';
import { initializeOverdueActivityChecker } from './app/modules/notification/overdueActivityService';
import { initializeActivityBadgeCron } from './app/modules/activityBadge/activityBadge.service';


const server = http.createServer(app);

initializeSocket(server);
async function main() {
  await mongoose.connect(config.database_url as string);
  console.log('Connected to MongoDB');
  // logger.info('Connected to MongoDB');
  
  // Initialize cron jobs
  initializeActivityReminderCron(); // Activity reminders (1 day before)
  initializeOverdueActivityChecker(); // Overdue activity notifications (daily check)
  initializeActivityBadgeCron(); // Activity badge reset (daily at 00:01 AM)
  
  server.listen(config.port, () => {
    console.log(`Server running at port ${config.port}`);
  });
}
main();
