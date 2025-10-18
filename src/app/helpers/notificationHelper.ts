import mongoose from 'mongoose';
import { NotificationService } from '../modules/notification/notification.service';
import { User } from '../modules/auth/auth.model';

// Helper function to create notification for task creation
export const createTaskNotification = async (taskData: {
  _id: string;
  title: string;
  assignTo?: string;
  createdBy: string;
}) => {
  try {
    // Determine recipients
    const recipients: mongoose.Types.ObjectId[] = [];

    // Add the creator
    recipients.push(new mongoose.Types.ObjectId(taskData.createdBy));

    // Add the assigned user if different from creator
    if (taskData.assignTo && taskData.assignTo !== taskData.createdBy) {
      recipients.push(new mongoose.Types.ObjectId(taskData.assignTo));
    }

    // Get all admins and super_admins
    const admins = await User.find({
      role: { $in: ['admin', 'super_admin'] },
      _id: { $nin: recipients }, // Don't duplicate if admin is creator/assignee
    }).select('_id');

    admins.forEach((admin) => {
      recipients.push(admin._id);
    });

    // Create notification (this already emits socket event)
    const notification = await NotificationService.createNotification({
      type: 'task',
      title: 'New Task Created',
      message: `Task "${taskData.title}" has been created`,
      entityType: 'Task',
      entityId: new mongoose.Types.ObjectId(taskData._id),
      triggeredBy: new mongoose.Types.ObjectId(taskData.createdBy),
      recipients: recipients,
      readBy: [],
      metadata: {
        taskId: taskData._id,
        taskTitle: taskData.title,
      },
    });

    console.log('✅ Task notification created for', recipients.length, 'users');
    return notification;
  } catch (error) {
    console.error('❌ Error creating task notification:', error);
    return null;
  }
};

// Helper function to create notification for lead creation
export const createLeadNotification = async (leadData: {
  _id: string;
  title: string;
  name: string;
  assignedTo?: string;
  createdBy: string;
}) => {
  try {
    // Determine recipients
    const recipients: mongoose.Types.ObjectId[] = [];

    // Add the creator
    recipients.push(new mongoose.Types.ObjectId(leadData.createdBy));

    // Add the assigned user if different from creator
    if (leadData.assignedTo && leadData.assignedTo !== leadData.createdBy) {
      recipients.push(new mongoose.Types.ObjectId(leadData.assignedTo));
    }

    // Get all admins and super_admins
    const admins = await User.find({
      role: { $in: ['admin', 'super_admin'] },
      _id: { $nin: recipients }, // Don't duplicate if admin is creator/assignee
    }).select('_id');

    admins.forEach((admin) => {
      recipients.push(admin._id);
    });

    // Create notification (this already emits socket event)
    const notification = await NotificationService.createNotification({
      type: 'lead',
      title: 'New Lead Created',
      message: `Lead "${leadData.title}" (${leadData.name}) has been created`,
      entityType: 'Lead',
      entityId: new mongoose.Types.ObjectId(leadData._id),
      triggeredBy: new mongoose.Types.ObjectId(leadData.createdBy),
      recipients: recipients,
      readBy: [],
      metadata: {
        leadId: leadData._id,
        leadTitle: leadData.title,
        leadName: leadData.name,
      },
    });

    console.log('✅ Lead notification created for', recipients.length, 'users');
    return notification;
  } catch (error) {
    console.error('❌ Error creating lead notification:', error);
    return null;
  }
};

// Helper function to create notification for task assignment
export const createTaskAssignmentNotification = async (taskData: {
  _id: string;
  title: string;
  assignTo: string;
  updatedBy: string;
}) => {
  try {
    const recipients: mongoose.Types.ObjectId[] = [
      new mongoose.Types.ObjectId(taskData.assignTo),
    ];

    // Get all admins
    const admins = await User.find({
      role: { $in: ['admin', 'super_admin'] },
      _id: { $ne: taskData.assignTo },
    }).select('_id');

    admins.forEach((admin) => {
      recipients.push(admin._id);
    });

    await NotificationService.createNotification({
      type: 'task',
      title: 'Task Assigned to You',
      message: `You have been assigned task "${taskData.title}"`,
      entityType: 'Task',
      entityId: new mongoose.Types.ObjectId(taskData._id),
      triggeredBy: new mongoose.Types.ObjectId(taskData.updatedBy),
      recipients: recipients,
      readBy: [],
      metadata: {
        taskId: taskData._id,
        taskTitle: taskData.title,
      },
    });

    console.log('✅ Task assignment notification created');
  } catch (error) {
    console.error('❌ Error creating task assignment notification:', error);
  }
};

// Helper function to create notification for lead assignment
export const createLeadAssignmentNotification = async (leadData: {
  _id: string;
  title: string;
  name: string;
  assignedTo: string;
  updatedBy: string;
}) => {
  try {
    const recipients: mongoose.Types.ObjectId[] = [
      new mongoose.Types.ObjectId(leadData.assignedTo),
    ];

    // Get all admins
    const admins = await User.find({
      role: { $in: ['admin', 'super_admin'] },
      _id: { $ne: leadData.assignedTo },
    }).select('_id');

    admins.forEach((admin) => {
      recipients.push(admin._id);
    });

    await NotificationService.createNotification({
      type: 'lead',
      title: 'Lead Assigned to You',
      message: `You have been assigned lead "${leadData.title}" (${leadData.name})`,
      entityType: 'Lead',
      entityId: new mongoose.Types.ObjectId(leadData._id),
      triggeredBy: new mongoose.Types.ObjectId(leadData.updatedBy),
      recipients: recipients,
      readBy: [],
      metadata: {
        leadId: leadData._id,
        leadTitle: leadData.title,
        leadName: leadData.name,
      },
    });

    console.log('✅ Lead assignment notification created');
  } catch (error) {
    console.error('❌ Error creating lead assignment notification:', error);
  }
};
