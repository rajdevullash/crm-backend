import express from 'express';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { NotificationController } from './notification.controller';

const router = express.Router();

// Get all notifications for logged-in user
router.get(
  '/',
  auth(
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.REPRESENTATIVE
  ),
  NotificationController.getAllNotifications
);

// Get unread count
router.get(
  '/unread-count',
  auth(
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.REPRESENTATIVE
  ),
  NotificationController.getUnreadCount
);

// Mark all notifications as read
router.patch(
  '/mark-all-read',
  auth(
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.REPRESENTATIVE
  ),
  NotificationController.markAllAsRead
);

// Mark single notification as read
router.patch(
  '/:id/mark-read',
  auth(
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.REPRESENTATIVE
  ),
  NotificationController.markAsRead
);

// Delete notification (admin only)
router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  NotificationController.deleteNotification
);

// Trigger activity reminder check manually (for testing - admin only)
router.post(
  '/trigger-reminder-check',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  NotificationController.triggerReminderCheck
);

export const NotificationRoutes = router;
