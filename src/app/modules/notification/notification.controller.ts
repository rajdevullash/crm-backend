import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { NotificationService } from './notification.service';
import { paginationFields } from '../../../constants/pagination';
import pick from '../../../shared/pick';
import { notificationFilterableFields } from './notification.constant';
import { INotification } from './notification.interface';
import { triggerActivityReminderCheck } from './activityReminderService';

// Get all notifications for logged-in user
const getAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const filters = pick(req.query, notificationFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await NotificationService.getAllNotifications(
    filters,
    paginationOptions,
    userId
  );

  sendResponse<INotification[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Mark notification as read
const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const result = await NotificationService.markAsRead(id, userId);

  sendResponse<INotification>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

// Mark all notifications as read
const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const result = await NotificationService.markAllAsRead(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
    data: result,
  });
});

// Get unread count
const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const count = await NotificationService.getUnreadCount(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unread count retrieved successfully',
    data: { unreadCount: count },
  });
});

// Delete notification (admin only)
const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await NotificationService.deleteNotification(id);

  sendResponse<INotification>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification deleted successfully',
    data: result,
  });
});

// Trigger activity reminder check manually (for testing)
const triggerReminderCheck = catchAsync(async (req: Request, res: Response) => {
  const result = await triggerActivityReminderCheck();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: result.success,
    message: result.success 
      ? `Reminder check completed. ${result.notificationsCreated} notifications created.`
      : 'Reminder check failed',
    data: result,
  });
});

export const NotificationController = {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  triggerReminderCheck,
};
