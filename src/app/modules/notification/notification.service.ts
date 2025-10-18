import { SortOrder } from 'mongoose';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { Notification } from './notification.model';
import {
  INotification,
  INotificationFilters,
} from './notification.interface';
import { notificationSearchableFields } from './notification.constant';
import { emitNotificationEvent } from '../socket/socketService';

// Create a new notification
const createNotification = async (
  payload: INotification
): Promise<INotification | null> => {
  const notification = await Notification.create(payload);

  // Populate the notification
  const populatedNotification = await Notification.findById(notification._id)
    .populate('triggeredBy', 'name email profileImage')
    .populate('entityId');

  // Emit socket event to all recipients
  if (populatedNotification && payload.recipients.length > 0) {
    const targetRooms = payload.recipients.map(
      (userId) => `user_${userId.toString()}`
    );

    emitNotificationEvent(
      'notification:new',
      {
        notification: populatedNotification,
        timestamp: new Date().toISOString(),
      },
      targetRooms
    );
  }

  return populatedNotification;
};

// Get all notifications for a user
const getAllNotifications = async (
  filters: INotificationFilters,
  paginationOptions: IPaginationOptions,
  userId: string
): Promise<IGenericResponse<INotification[]>> => {
  const { searchTerm, type, isRead, ...filtersData } = filters;

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];

  // Filter by user - only show notifications for this user
  andConditions.push({
    recipients: userId,
  });

  // Search term
  if (searchTerm) {
    andConditions.push({
      $or: notificationSearchableFields.map((field) => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  // Filter by type
  if (type) {
    andConditions.push({ type });
  }

  // Filter by read/unread status
  if (isRead !== undefined) {
    if (isRead === 'true') {
      // Show only read notifications for this user
      andConditions.push({
        'readBy.userId': userId,
      });
    } else {
      // Show only unread notifications for this user
      andConditions.push({
        'readBy.userId': { $ne: userId },
      });
    }
  }

  // Apply other filters
  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const sortConditions: { [key: string]: SortOrder } = {};

  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  } else {
    sortConditions.createdAt = 'desc';
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Notification.find(whereConditions)
    .populate('triggeredBy', 'name email profileImage role')
    .populate('entityId')
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// Mark notification as read for specific user
const markAsRead = async (
  notificationId: string,
  userId: string
): Promise<INotification | null> => {
  // Check if already read by this user
  const notification = await Notification.findOne({
    _id: notificationId,
    recipients: userId,
  });

  if (!notification) {
    throw new Error('Notification not found or access denied');
  }

  // Check if user already read this notification
  const alreadyRead = notification.readBy.some(
    (read) => read.userId.toString() === userId
  );

  if (alreadyRead) {
    return notification; // Already marked as read
  }

  // Add user to readBy array
  const result = await Notification.findByIdAndUpdate(
    notificationId,
    {
      $push: {
        readBy: {
          userId,
          readAt: new Date(),
        },
      },
    },
    { new: true }
  )
    .populate('triggeredBy', 'name email profileImage')
    .populate('entityId');

  // Emit socket event
  if (result) {
    emitNotificationEvent(
      'notification:read',
      {
        notificationId,
        userId,
        timestamp: new Date().toISOString(),
      },
      [`user_${userId}`]
    );
  }

  return result;
};

// Mark all notifications as read for a user
const markAllAsRead = async (userId: string): Promise<{ modifiedCount: number }> => {
  const result = await Notification.updateMany(
    {
      recipients: userId,
      'readBy.userId': { $ne: userId },
    },
    {
      $push: {
        readBy: {
          userId,
          readAt: new Date(),
        },
      },
    }
  );

  // Emit socket event
  emitNotificationEvent(
    'notification:allRead',
    {
      userId,
      count: result.modifiedCount,
      timestamp: new Date().toISOString(),
    },
    [`user_${userId}`]
  );

  return { modifiedCount: result.modifiedCount };
};

// Get unread count for a user
const getUnreadCount = async (userId: string): Promise<number> => {
  const count = await Notification.countDocuments({
    recipients: userId,
    'readBy.userId': { $ne: userId },
  });

  return count;
};

// Delete a notification (admin only)
const deleteNotification = async (
  notificationId: string
): Promise<INotification | null> => {
  const result = await Notification.findByIdAndDelete(notificationId);
  return result;
};

export const NotificationService = {
  createNotification,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
};
