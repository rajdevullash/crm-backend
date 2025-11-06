/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Model } from 'mongoose';

export type INotification = {
  type: 'task' | 'lead' | 'system';
  title: string;
  message: string;
  
  // Reference to the related entity
  entityType: 'Task' | 'Lead' | 'User';
  entityId: mongoose.Types.ObjectId;
  
  // Who triggered this notification
  triggeredBy: mongoose.Types.ObjectId;
  
  // Recipients - array of user IDs who should see this notification
  recipients: mongoose.Types.ObjectId[];
  
  // Read status per user - array of users who have read this notification
  readBy: {
    userId: mongoose.Types.ObjectId;
    readAt: Date;
  }[];
  
  // Additional metadata
  metadata?: any;
  
  createdAt?: Date;
  updatedAt?: Date;
};

export type NotificationModel = Model<INotification, Record<string, unknown>>;

export type INotificationFilters = {
  searchTerm?: string;
  type?: 'task' | 'lead' | 'system';
  isRead?: string; // 'true' or 'false'
  userId?: string;
};
