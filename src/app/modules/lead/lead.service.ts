/* eslint-disable @typescript-eslint/no-explicit-any */
// Your service code here
import httpStatus from 'http-status';
import mongoose, { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { leadSearchableFields } from './lead.constant';
import { ILead, ILeadFilters } from './lead.interface';
import { Lead } from './lead.model';
import { User } from '../auth/auth.model';
import { Stage } from '../stage/stage.model';
import { Task } from '../task/task.model';
import { DealCloseRequest } from '../dealCloseRequest/dealCloseRequest.model';
import { Notification } from '../notification/notification.model';
import { NotificationService } from '../notification/notification.service';
import { emitActivityEvent } from '../socket/socketService';

const createLead = async (payload: ILead): Promise<ILead | null> => {
  // Validate userId
  const userId = payload.createdBy;
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'createdBy is required');
  }

  // ✅ If stage is not provided or is null/empty, set the first stage as default
  if (!payload.stage || payload.stage.toString() === '') {
    const firstStage = await Stage.findOne({ isActive: true }).sort({ position: 1 });
    if (firstStage) {
      payload.stage = firstStage._id;
      console.log(`No stage provided. Setting default stage: ${firstStage.title} (${firstStage._id})`);
    } else {
      throw new ApiError(httpStatus.NOT_FOUND, 'No active stage found. Please create a stage first.');
    }
  }

  // Update user's totalLeads count
  const user = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { totalLeads: 1 } },
    { new: true }
  );

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Add initial history entry for lead creation
  const initialHistory = {
    action: 'created',
    changedBy: userId,
    timestamp: new Date(),
    description: 'Lead was created'
  };

  // Add history to payload
  const leadDataWithHistory = {
    ...payload,
    history: [initialHistory]
  };

  // Create lead
  const result = await Lead.create(leadDataWithHistory);
  
  // Note: Notification for lead creation is handled in the controller via createLeadNotification
  // This prevents duplicate notifications when a lead is created with assignment
  
  return result;
};

//get all leads
const getAllLeads = async (
  filters: ILeadFilters,
  paginationOptions: IPaginationOptions,
  userRole?: string,
  userId?: string
): Promise<IGenericResponse<ILead[]>> => {
  // Extract searchTerm and special filters
  const { searchTerm, minBudget, maxBudget, ...filtersData } = filters;

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];
  
  // Add role-based filtering
  if (userRole === 'representative' && userId) {
    // Representatives should only see leads currently assigned to them
    // Not leads they created but are now assigned to others
    andConditions.push({
      assignedTo: userId
    });
  }
  
  // Search needs $or for searching in specified fields
  if (searchTerm) {
    andConditions.push({
      $or: leadSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }
  
  // Handle budget range filtering
  if (minBudget || maxBudget) {
    const budgetCondition: any = {};
    if (minBudget) budgetCondition.$gte = Number(minBudget);
    if (maxBudget) budgetCondition.$lte = Number(maxBudget);
    andConditions.push({ budget: budgetCondition });
  }
  
  // Filters needs $and to fulfill all the conditions
  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  // Dynamic Sort needs field to do sorting
  const sortConditions: { [key: string]: SortOrder } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  } else {
    // Default sort by order within stage, then by creation date (newest first)
    sortConditions['order'] = 1;
    sortConditions['createdAt'] = -1;
  }
  
  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Lead.find(whereConditions)
    .populate('stage')
    .populate('assignedTo')
    .populate('createdBy')
    .populate('notes.addedBy')
    .populate('activities.addedBy')
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Lead.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

//get specific lead
const getSpecificLead = async (id: string): Promise<ILead | null> => {
  const result = await Lead.findById(id)
    .populate('stage')
    .populate('assignedTo')
    .populate('createdBy')
    .populate('notes.addedBy')
    .populate('activities.addedBy')
    .populate('history.changedBy');
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  return result;
};

const updateLead = async (
  id: string,
  payload: Partial<ILead>,
  userId?: string
): Promise<ILead | null> => {
  console.log('id', id);
  
  // Clean up empty string values that should be undefined (for ObjectId fields)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((payload.assignedTo as any) === '' || payload.assignedTo === null) {
    delete payload.assignedTo;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((payload.stage as any) === '' || payload.stage === null) {
    delete payload.stage;
  }
  
  const existingLead = await Lead.findOne({ _id: id })
    .populate('stage')
    .populate('assignedTo');
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  // Prepare history entries
  const historyEntries: any[] = [];
  const currentUserId = userId || existingLead.createdBy;

  // Check if stage is being updated
  if (payload.stage && payload.stage.toString() !== existingLead.stage?._id?.toString()) {
    // Get the new stage details
    const newStage = await Stage.findById(payload.stage);
    if (!newStage) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Stage not found');
    }

    // Add history entry for stage change
    const oldStageTitle = (existingLead.stage as any)?.title || 'No stage';
    historyEntries.push({
      action: 'stage_changed',
      field: 'stage',
      oldValue: oldStageTitle,
      newValue: newStage.title,
      changedBy: currentUserId,
      timestamp: new Date(),
      description: `Stage changed from "${oldStageTitle}" to "${newStage.title}"`
    });

    // Find the last stage (highest position)
    const lastStage = await Stage.findOne().sort({ position: -1 });
    
    if (lastStage) {
      const isMovingToLastStage = newStage._id.toString() === lastStage._id.toString();
      const isMovingFromLastStage = existingLead.stage?._id?.toString() === lastStage._id.toString();
      
      // Determine which user to credit/debit for the conversion
      // Priority: assignedTo > createdBy
      const targetUserId = existingLead.assignedTo || existingLead.createdBy;
      
      if (targetUserId) {
        // SCENARIO 1: Moving TO the last stage (Mark as converted)
        if (isMovingToLastStage && !isMovingFromLastStage) {
          console.log('Lead moved to last stage - checking for conversion tracking');
          
          const user = await User.findOne({ _id: targetUserId });
          
          if (user) {
            // Migrate old data structure if convertedLeads is not an array
            if (!Array.isArray(user.convertedLeads)) {
              console.log('Converting convertedLeads from number to array...');
              await User.findOneAndUpdate(
                { _id: targetUserId },
                { $set: { convertedLeads: [] } },
                { new: true }
              );
              user.convertedLeads = [];
            }
            
            // Check if this lead is already counted in convertedLeads
            const isAlreadyCounted = user.convertedLeads?.some(
              (leadEntry: any) => leadEntry?._id?.toString() === existingLead._id.toString()
            );

            if (!isAlreadyCounted) {
              console.log(`Adding lead to converted leads for user: ${targetUserId}`);
              
              // Add the lead to convertedLeads array
              await User.findOneAndUpdate(
                { _id: targetUserId },
                { 
                  $push: { 
                    convertedLeads: existingLead._id 
                  }
                },
                { new: true }
              );
              
              console.log('Successfully tracked lead conversion');
            } else {
              console.log('Lead already counted in converted leads');
            }
          }
        }
        
        // SCENARIO 2: Moving FROM the last stage to another stage (Unconvert)
        if (isMovingFromLastStage && !isMovingToLastStage) {
          console.log('Lead moved FROM last stage - removing from converted leads');
          
          // Remove the lead from convertedLeads array
          await User.findOneAndUpdate(
            { _id: targetUserId },
            { 
              $pull: { 
                convertedLeads: existingLead._id 
              }
            },
            { new: true }
          );
          
          console.log(`Removed lead from converted leads for user: ${targetUserId}`);
        }
      }
    }
  }

  // Check if assignedTo is being updated
  if (payload.assignedTo && payload.assignedTo.toString() !== existingLead.assignedTo?._id?.toString()) {
    const newAssignee = await User.findById(payload.assignedTo);
    const oldAssigneeName = (existingLead.assignedTo as any)?.name || 'Unassigned';
    const newAssigneeName = newAssignee?.name || 'Unassigned';
    
    historyEntries.push({
      action: 'assigned',
      field: 'assignedTo',
      oldValue: oldAssigneeName,
      newValue: newAssigneeName,
      changedBy: currentUserId,
      timestamp: new Date(),
      description: `Lead reassigned from "${oldAssigneeName}" to "${newAssigneeName}"`
    });

    // Create notification for the newly assigned representative
    if (newAssignee && currentUserId) {
      const assignedByUser = await User.findById(currentUserId);
      const isReassignment = existingLead.assignedTo?._id ? true : false;
      
      await NotificationService.createNotification({
        type: 'lead',
        title: isReassignment ? 'Lead Reassigned to You' : 'New Lead Assigned',
        message: `${assignedByUser?.name || 'Admin'} has ${isReassignment ? 'reassigned' : 'assigned'} the lead "${existingLead.title}" to you`,
        recipients: [payload.assignedTo],
        triggeredBy: new mongoose.Types.ObjectId(currentUserId),
        entityType: 'Lead',
        entityId: existingLead._id,
        readBy: []
      });
      
      console.log(`✅ Notification sent to ${newAssigneeName} for lead assignment`);
    }
  }

  // Track general field updates (title, name, email, phone, source, budget, currency)
  const fieldsToTrack = [
    { key: 'title' as keyof ILead, label: 'Title' },
    { key: 'name' as keyof ILead, label: 'Name' },
    { key: 'email' as keyof ILead, label: 'Email' },
    { key: 'phone' as keyof ILead, label: 'Phone' },
    { key: 'source' as keyof ILead, label: 'Source' },
    { key: 'budget' as keyof ILead, label: 'Budget' },
    { key: 'currency' as keyof ILead, label: 'Currency' },
  ];

  for (const field of fieldsToTrack) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payloadValue = (payload as any)[field.key];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingValue = (existingLead as any)[field.key];
    
    if (payloadValue !== undefined) {
      // Convert both values to strings for comparison to handle type differences
      const oldValueStr = existingValue?.toString() || '';
      const newValueStr = payloadValue?.toString() || '';
      
      // Only add to history if values are actually different
      if (oldValueStr !== newValueStr) {
        const oldDisplay = oldValueStr || 'Not set';
        const newDisplay = newValueStr || 'Not set';
        
        historyEntries.push({
          action: 'updated',
          field: field.key,
          oldValue: oldDisplay,
          newValue: newDisplay,
          changedBy: currentUserId,
          timestamp: new Date(),
          description: `${field.label} changed from "${oldDisplay}" to "${newDisplay}"`
        });
      }
    }
  }

  // Check if notes are being added
  if (payload.notes && Array.isArray(payload.notes)) {
    const existingNotesCount = existingLead.notes?.length || 0;
    const newNotesCount = payload.notes.length;
    
    if (newNotesCount > existingNotesCount) {
      // New note was added
      const addedNotesCount = newNotesCount - existingNotesCount;
      historyEntries.push({
        action: 'note_added',
        field: 'notes',
        changedBy: currentUserId,
        timestamp: new Date(),
        description: addedNotesCount === 1 ? 'Added a new note' : `Added ${addedNotesCount} new notes`
      });
    } else if (newNotesCount < existingNotesCount) {
      // Note was deleted
      const deletedNotesCount = existingNotesCount - newNotesCount;
      historyEntries.push({
        action: 'note_deleted',
        field: 'notes',
        changedBy: currentUserId,
        timestamp: new Date(),
        description: deletedNotesCount === 1 ? 'Deleted a note' : `Deleted ${deletedNotesCount} notes`
      });
    }
  }

  // Quick note updates are not logged to prevent cluttering the activity log
  // The quick note is saved but doesn't create a history entry

  // Check if activities are being added, edited, or deleted
  if (payload.activities && Array.isArray(payload.activities)) {
    const existingActivitiesCount = existingLead.activities?.length || 0;
    const newActivitiesCount = payload.activities.length;
    
    if (newActivitiesCount > existingActivitiesCount) {
      // New activity was added
      const newActivity = payload.activities[payload.activities.length - 1];
      const activityType = newActivity.type || 'activity';
      
      // Format the scheduled date
      let scheduledDate = '';
      if (newActivity.date) {
        const date = new Date(newActivity.date);
        scheduledDate = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      } else if (newActivity.meetingDate) {
        const date = new Date(newActivity.meetingDate);
        scheduledDate = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      // Create description with scheduled date
      const description = scheduledDate 
        ? `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} has been scheduled for ${scheduledDate}`
        : `Added a new ${activityType} activity`;
      
      historyEntries.push({
        action: 'activity_added',
        field: 'activities',
        newValue: activityType,
        changedBy: currentUserId,
        timestamp: new Date(),
        description: description
      });
    } else if (newActivitiesCount < existingActivitiesCount) {
      // Activity was deleted - find which one
      const deletedActivity = existingLead.activities?.find((existingAct: any) => 
        !payload.activities?.some((newAct: any) => 
          (newAct._id && newAct._id.toString() === existingAct._id.toString()) ||
          (newAct.id && newAct.id.toString() === existingAct._id.toString())
        )
      );
      
      if (deletedActivity) {
        const activityType = deletedActivity.type || 'activity';
        let scheduledDate = '';
        if (deletedActivity.date) {
          const date = new Date(deletedActivity.date);
          scheduledDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        } else if (deletedActivity.meetingDate) {
          const date = new Date(deletedActivity.meetingDate);
          scheduledDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        }
        
        const description = scheduledDate
          ? `Deleted ${activityType} scheduled for ${scheduledDate}`
          : `Deleted a ${activityType} activity`;
        
        historyEntries.push({
          action: 'activity_deleted',
          field: 'activities',
          changedBy: currentUserId,
          timestamp: new Date(),
          description: description
        });
      } else {
        historyEntries.push({
          action: 'activity_deleted',
          field: 'activities',
          changedBy: currentUserId,
          timestamp: new Date(),
          description: 'Deleted an activity'
        });
      }
    } else if (newActivitiesCount === existingActivitiesCount && newActivitiesCount > 0) {
      // Check if any activity was edited or status changed
      for (let i = 0; i < payload.activities.length; i++) {
        const newActivity = payload.activities[i];
        const existingActivity = existingLead.activities?.find((act: any) => 
          (newActivity._id && act._id.toString() === newActivity._id.toString()) ||
          (newActivity.id && act._id.toString() === newActivity.id.toString())
        );
        
        if (existingActivity) {
          const activityType = newActivity.type || existingActivity.type || 'activity';
          
          // Check if activity was marked as done
          if (newActivity.completed && !existingActivity.completed) {
            let scheduledDate = '';
            if (newActivity.date) {
              const date = new Date(newActivity.date);
              scheduledDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            }
            
            let description = scheduledDate
              ? `Marked ${activityType} (${scheduledDate}) as done`
              : `Marked ${activityType} as done`;
            
            // Add feedback if provided
            if (newActivity.feedback && newActivity.feedback.trim() !== '') {
              description += ` with feedback: "${newActivity.feedback}"`;
            }
            
            historyEntries.push({
              action: 'activity_completed',
              field: 'activities',
              changedBy: currentUserId,
              timestamp: new Date(),
              description: description
            });
          } 
          // Check if activity was marked as undone
          else if (!newActivity.completed && existingActivity.completed) {
            let scheduledDate = '';
            if (newActivity.date) {
              const date = new Date(newActivity.date);
              scheduledDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            }
            
            const description = scheduledDate
              ? `Marked ${activityType} (${scheduledDate}) as not done`
              : `Marked ${activityType} as not done`;
            
            historyEntries.push({
              action: 'activity_undone',
              field: 'activities',
              changedBy: currentUserId,
              timestamp: new Date(),
              description: description
            });
          }
          // Check if feedback was edited (for completed activities)
          else if (newActivity.completed && existingActivity.completed && 
                   newActivity.feedback !== existingActivity.feedback) {
            historyEntries.push({
              action: 'activity_feedback_updated',
              field: 'activities',
              changedBy: currentUserId,
              timestamp: new Date(),
              description: `Updated feedback for ${activityType}: "${newActivity.feedback}"`
            });
          }
          // Check if other fields were edited (for both completed and non-completed activities)
          else {
            // Check if any field changed
            const fieldsChanged = 
              newActivity.type !== existingActivity.type ||
              newActivity.date !== existingActivity.date ||
              newActivity.callNote !== existingActivity.callNote ||
              newActivity.meetingDate !== existingActivity.meetingDate ||
              newActivity.meetingType !== existingActivity.meetingType ||
              newActivity.meetingLink !== existingActivity.meetingLink ||
              newActivity.meetingLocation !== existingActivity.meetingLocation ||
              newActivity.emailNote !== existingActivity.emailNote ||
              newActivity.customNote !== existingActivity.customNote;
            
            if (fieldsChanged) {
              let scheduledDate = '';
              if (newActivity.date) {
                const date = new Date(newActivity.date);
                scheduledDate = date.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                });
              }
              
              const statusText = newActivity.completed ? ' (completed)' : '';
              const description = scheduledDate
                ? `Updated ${activityType}${statusText} scheduled for ${scheduledDate}`
                : `Updated ${activityType}${statusText} activity`;
              
              historyEntries.push({
                action: 'activity_updated',
                field: 'activities',
                changedBy: currentUserId,
                timestamp: new Date(),
                description: description
              });
            }
          }
        }
      }
    }
  }

  // Check for overdue activities and mark them in history
  if (existingLead.activities && Array.isArray(existingLead.activities)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    existingLead.activities.forEach((activity: any) => {
      // Check if activity is overdue and not marked as overdue yet
      if (!activity.completed && !activity.markedAsOverdue) {
        const activityDate = new Date(activity.date || activity.meetingDate);
        activityDate.setHours(0, 0, 0, 0);
        
        if (activityDate < today) {
          // Activity is overdue
          const activityType = activity.type || 'activity';
          const overdueDate = activityDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          
          historyEntries.push({
            action: 'activity_overdue',
            field: 'activities',
            changedBy: currentUserId,
            timestamp: new Date(),
            description: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} scheduled for ${overdueDate} is overdue`
          });
          
          // Mark this activity as overdue so we don't log it again
          activity.markedAsOverdue = true;
        }
      }
    });
    
    // Update the activities array with markedAsOverdue flag if any were marked
    if (historyEntries.some((entry: any) => entry.action === 'activity_overdue')) {
      payload.activities = existingLead.activities;
    }
  }

  // Check if attachments are being added or removed
  if (payload.attachment !== undefined && payload.attachment !== null) {
    const existingAttachmentsCount = existingLead.attachment?.length || 0;
    const newAttachmentsCount = Array.isArray(payload.attachment) ? payload.attachment.length : 0;
    
    if (newAttachmentsCount > existingAttachmentsCount) {
      // New attachment was added
      const addedCount = newAttachmentsCount - existingAttachmentsCount;
      const newAttachment = Array.isArray(payload.attachment) && payload.attachment.length > 0 
        ? payload.attachment[payload.attachment.length - 1] 
        : null;
      const fileName = newAttachment?.originalName || 'file';
      historyEntries.push({
        action: 'attachment_added',
        field: 'attachment',
        newValue: fileName,
        changedBy: currentUserId,
        timestamp: new Date(),
        description: addedCount === 1 ? `Uploaded attachment: ${fileName}` : `Uploaded ${addedCount} attachments`
      });
    } else if (newAttachmentsCount < existingAttachmentsCount) {
      // Attachment was deleted
      const deletedCount = existingAttachmentsCount - newAttachmentsCount;
      historyEntries.push({
        action: 'attachment_deleted',
        field: 'attachment',
        changedBy: currentUserId,
        timestamp: new Date(),
        description: deletedCount === 1 ? 'Deleted an attachment' : `Deleted ${deletedCount} attachments`
      });
    }
  }

  // Perform the update in the database
  let result;
  if (historyEntries.length > 0) {
    // Use $push operator to add history entries
    result = await Lead.findOneAndUpdate(
      { _id: id }, 
      {
        ...payload,
        $push: { history: { $each: historyEntries } }
      } as any,
      { new: true }
    )
      .populate('stage')
      .populate('assignedTo')
      .populate('createdBy')
      .populate('history.changedBy');
  } else {
    // Regular update without history
    result = await Lead.findOneAndUpdate({ _id: id }, payload, { new: true })
      .populate('stage')
      .populate('assignedTo')
      .populate('createdBy')
      .populate('history.changedBy');
  }

  // Emit socket events for activity changes
  const activityChanges = historyEntries.filter((entry: any) => 
    entry.action.startsWith('activity_')
  );

  if (activityChanges.length > 0 && result) {
    activityChanges.forEach((change: any) => {
      // Determine the event type based on the action
      let eventType = 'activity:updated';
      if (change.action === 'activity_added') {
        eventType = 'activity:created';
      } else if (change.action === 'activity_deleted') {
        eventType = 'activity:deleted';
      } else if (change.action === 'activity_completed') {
        eventType = 'activity:completed';
      }

      // Determine target rooms for socket emission
      const targetRooms: string[] = [];
      
      // Strategy:
      // 1. Send to assigned user's room (representative or admin assigned to this lead)
      // 2. Send to admin role rooms (so all admins see all activities)
      // Note: We don't send to role_representative to avoid duplicates since 
      // representatives already receive via their user room
      
      if (result.assignedTo && result.assignedTo._id) {
        targetRooms.push(`user_${result.assignedTo._id}`);
      }
      
      // Send to all admin role rooms so all admins can see all activities
      targetRooms.push('role_admin');
      targetRooms.push('role_super_admin'); // Include super_admin role

      // Log activity event emission for debugging
      console.log('📢 Emitting activity event:', {
        eventType,
        leadId: result._id,
        leadTitle: result.title,
        action: change.action,
        targetRooms,
        assignedTo: result.assignedTo?._id,
      });

      // Emit the activity event
      emitActivityEvent(eventType, {
        lead: {
          _id: result._id,
          title: result.title,
          name: result.name,
          stage: result.stage,
        },
        activity: change.action === 'activity_added' && payload.activities 
          ? payload.activities[payload.activities.length - 1]
          : null,
        change: {
          action: change.action,
          description: change.description,
          timestamp: change.timestamp,
          changedBy: change.changedBy,
        },
        timestamp: new Date().toISOString(),
      }, targetRooms);
    });
  }

  return result;
};

//delete lead
const deleteLead = async (id: string): Promise<ILead | null> => {
  // Find the lead to delete
  const existingLead = await Lead.findOne({ _id: id });
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  console.log(`Deleting lead: ${existingLead._id}`);

  // Step 1: Update the creator's totalLeads count
  const userId = existingLead.createdBy;
  if (userId) {
    console.log(`Updating creator user: ${userId}`);
    
    const userUpdateResult = await User.findOneAndUpdate(
      { _id: userId },
      { 
        $inc: { totalLeads: -1 }, 
      },
      { new: true }
    );

    if (!userUpdateResult) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Creator user not found');
    }

    console.log(`Updated creator's totalLeads: ${userUpdateResult.totalLeads}`);
  }

  // Step 2: Remove this lead from ALL users' convertedLeads arrays
  // This handles cases where the lead was assigned to a representative
  // and they converted it, or if the creator converted it
  const usersWithConvertedLead = await User.updateMany(
    { convertedLeads: existingLead._id },
    { 
      $pull: { convertedLeads: existingLead._id } 
    }
  );

  if (usersWithConvertedLead.modifiedCount > 0) {
    console.log(`Removed lead from ${usersWithConvertedLead.modifiedCount} user(s) convertedLeads arrays`);
  }

  // Step 3: Delete associated tasks
  const deletedTasks = await Task.deleteMany(
    { lead: existingLead._id }
  );
  
  console.log(`Deleted ${deletedTasks.deletedCount} associated tasks`);

  // Step 4: Delete associated DealCloseRequest records
  const deletedCloseRequests = await DealCloseRequest.deleteMany(
    { lead: existingLead._id }
  );
  
  console.log(`Deleted ${deletedCloseRequests.deletedCount} associated deal close requests`);

  // Step 5: Delete associated notifications (notifications related to this lead)
  const deletedNotifications = await Notification.deleteMany({
    entityType: 'Lead',
    entityId: existingLead._id,
  });
  
  console.log(`Deleted ${deletedNotifications.deletedCount} associated notifications`);

  // Step 6: Delete the lead
  const deletedLead = await Lead.findOneAndDelete(
    { _id: id }
  );

  if (!deletedLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found during deletion');
  }

  console.log('✅ Lead deletion completed successfully');
  console.log(`   - Tasks deleted: ${deletedTasks.deletedCount}`);
  console.log(`   - Deal close requests deleted: ${deletedCloseRequests.deletedCount}`);
  console.log(`   - Notifications deleted: ${deletedNotifications.deletedCount}`);

  return deletedLead;
};

const reorderLeads = async (leadOrders: { leadId: string; order: number }[]): Promise<void> => {
  try {
    // Update each lead's order without transaction to avoid conflicts
    // When moving between stages, updateLead is called first without transaction
    // Using transaction here causes "transaction number mismatch" errors
    const updatePromises = leadOrders.map(({ leadId, order }) =>
      Lead.findByIdAndUpdate(
        leadId,
        { order },
        { new: true }
      )
    );

    await Promise.all(updatePromises);
    console.log('✅ Lead reordering completed successfully');
  } catch (error) {
    console.error('❌ Lead reordering failed:', error);
    throw error;
  }
};

// Get all activities from all leads (for global activity log)
const getAllActivities = async (query: Record<string, unknown>): Promise<any> => {
  const { userId, role } = query;

  // Build query conditions based on user role
  const whereConditions: any = {};
  
  // If representative, only show activities from their assigned leads
  // Only add assignedTo filter if userId is valid (not undefined, null, or "undefined" string)
  if (role === 'representative' && userId && userId !== 'undefined' && userId !== 'null') {
    whereConditions.assignedTo = userId;
  }
  // Admin and super_admin see all activities

  // Fetch all leads with activities
  const leads = await Lead.find(whereConditions)
    .populate('stage')
    .populate('assignedTo')
    .populate('activities.addedBy')
    .populate('activities.completedBy')
    .select('title name activities assignedTo stage')
    .lean();

  // Extract and flatten all activities from leads
  const allActivities: any[] = [];
  
  leads.forEach(lead => {
    if (lead.activities && lead.activities.length > 0) {
      lead.activities.forEach((activity: any) => {
        allActivities.push({
          ...activity,
          leadId: lead._id,
          leadTitle: lead.title,
          leadName: lead.name,
          assignedTo: lead.assignedTo,
          stage: lead.stage,
        });
      });
    }
  });

  // Sort activities by date (newest first)
  allActivities.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  return allActivities;
};

// Get recent activity notifications from lead history
const getRecentActivityNotifications = async (query: Record<string, unknown>): Promise<any> => {
  const { userId, role, limit = 20 } = query;

  // Build query conditions based on user role
  const whereConditions: any = {};
  
  // If representative, only show activities from their assigned leads
  // Only add assignedTo filter if userId is valid (not undefined, null, or "undefined" string)
  if (role === 'representative' && userId && userId !== 'undefined' && userId !== 'null') {
    whereConditions.assignedTo = userId;
  }
  // Admin and super_admin see all activities

  // Fetch leads with history containing activity changes
  const leads = await Lead.find({
    ...whereConditions,
    'history.action': { 
      $in: ['activity_added', 'activity_completed', 'activity_updated', 'activity_deleted'] 
    }
  })
    .populate('stage')
    .populate('assignedTo')
    .populate('history.changedBy')
    .select('title name history assignedTo stage')
    .lean();

  // Import ActivityRead model
  const { ActivityRead } = await import('../activityRead/activityRead.model');

  // Get all read activity IDs for this user
  const readActivities = await ActivityRead.find({ userId }).select('activityId').lean();
  const readActivityIds = new Set(readActivities.map(r => r.activityId));

  // Extract activity-related history entries
  const activityNotifications: any[] = [];
  
  leads.forEach(lead => {
    if (lead.history && lead.history.length > 0) {
      // Filter only activity-related history entries
      const activityHistoryEntries = lead.history.filter((h: any) => 
        ['activity_added', 'activity_completed', 'activity_updated', 'activity_deleted'].includes(h.action)
      );
      
      activityHistoryEntries.forEach((historyEntry: any) => {
        const activityId = `${lead._id}_${historyEntry._id}`;
        activityNotifications.push({
          id: activityId,
          leadId: lead._id,
          historyId: historyEntry._id, // Add historyId for marking overdue notifications
          leadTitle: lead.title,
          leadName: lead.name,
          assignedTo: lead.assignedTo,
          stage: lead.stage,
          action: historyEntry.action,
          description: historyEntry.description,
          timestamp: historyEntry.timestamp,
          changedBy: historyEntry.changedBy,
          isRead: readActivityIds.has(activityId), // Check if user has read this activity
          overdueNotificationSent: historyEntry.overdueNotificationSent || false, // Track if overdue notification was sent
        });
      });
    }
  });

  // Sort by timestamp (newest first) and limit results
  activityNotifications.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });

  return activityNotifications.slice(0, Number(limit));
};

// Mark a single activity as read
const markActivityAsRead = async (userId: string, activityId: string): Promise<any> => {
  const { ActivityRead } = await import('../activityRead/activityRead.model');
  
  // Check if already marked as read
  const existing = await ActivityRead.findOne({ userId, activityId });
  if (existing) {
    return { message: 'Activity already marked as read' };
  }
  
  // Mark as read
  await ActivityRead.create({ userId, activityId, readAt: new Date() });
  
  return { message: 'Activity marked as read successfully' };
};

// Mark all activities as read for a user
const markAllActivitiesAsRead = async (userId: string, role: string): Promise<any> => {
  // Get all activity notifications for this user
  const activities = await getRecentActivityNotifications({ userId, role, limit: 100 });
  
  const { ActivityRead } = await import('../activityRead/activityRead.model');
  
  // Get already read activity IDs
  const existingReads = await ActivityRead.find({ userId }).select('activityId').lean();
  const existingReadIds = new Set(existingReads.map(r => r.activityId));
  
  // Filter out activities that are already marked as read
  const unreadActivities = activities.filter((a: any) => !existingReadIds.has(a.id));
  
  if (unreadActivities.length === 0) {
    return { message: 'No unread activities to mark', count: 0 };
  }
  
  // Bulk insert read records
  const readRecords = unreadActivities.map((a: any) => ({
    userId,
    activityId: a.id,
    readAt: new Date(),
  }));
  
  await ActivityRead.insertMany(readRecords, { ordered: false });
  
  return { 
    message: 'All activities marked as read successfully',
    count: readRecords.length 
  };
};

// Get unread activity count
const getUnreadActivityCount = async (userId: string, role: string): Promise<number> => {
  // Get all activities
  const activities = await getRecentActivityNotifications({ userId, role, limit: 100 });
  
  const { ActivityRead } = await import('../activityRead/activityRead.model');
  
  // Get read activity IDs
  const readActivities = await ActivityRead.find({ userId }).select('activityId').lean();
  const readActivityIds = new Set(readActivities.map(r => r.activityId));
  
  // Count unread
  const unreadCount = activities.filter((a: any) => !readActivityIds.has(a.id)).length;
  
  return unreadCount;
};

// Mark activity overdue notification as sent
const markActivityOverdueNotificationSent = async (leadId: string, historyId: string): Promise<any> => {
  const lead = await Lead.findById(leadId);
  
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  
  // Check if history exists
  if (!lead.history || lead.history.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead has no history entries');
  }
  
  // Find the history entry and update overdueNotificationSent flag
  const historyEntry = lead.history.find((h: any) => h._id.toString() === historyId);
  
  if (!historyEntry) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity history entry not found');
  }
  
  // Update the specific history entry
  await Lead.updateOne(
    { _id: leadId, 'history._id': historyId },
    { $set: { 'history.$.overdueNotificationSent': true } }
  );
  
  return { message: 'Overdue notification marked as sent' };
};

// Get leads for Kanban board with pagination per stage
const getKanbanLeads = async (
  stageId?: string,
  skip: number = 0,
  limit: number = 5,
  userRole?: string,
  userId?: string
): Promise<any> => {
  // Build base query based on role
  const baseQuery: any = {};
  
  if (userRole === 'representative' && userId) {
    baseQuery.assignedTo = userId;
  }
  
  // If stageId provided, fetch more leads for that specific stage
  if (stageId) {
    const query = { ...baseQuery, stage: stageId };
    const leads = await Lead.find(query)
      .populate('stage')
      .populate('assignedTo')
      .populate('createdBy')
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Lead.countDocuments(query);
    
    return {
      stageId,
      leads,
      total,
      hasMore: skip + leads.length < total,
    };
  }
  
  // Otherwise, fetch initial 5 leads for each stage
  const stages = await Stage.find({ isActive: true }).sort({ position: 1 });
  const result: any = {};
  
  for (const stage of stages) {
    const query = { ...baseQuery, stage: stage._id };
    const leads = await Lead.find(query)
      .populate('stage')
      .populate('assignedTo')
      .populate('createdBy')
      .sort({ order: 1, createdAt: -1 })
      .limit(limit);
    
    const total = await Lead.countDocuments(query);
    
    result[stage._id.toString()] = {
      stageId: stage._id,
      stageName: stage.title,
      leads,
      total,
      hasMore: leads.length < total,
    };
  }
  
  return result;
};

export const LeadService = {
  createLead,
  getAllLeads,
  getSpecificLead,
  updateLead,
  deleteLead,
  reorderLeads,
  getAllActivities,
  getRecentActivityNotifications,
  markActivityAsRead,
  markAllActivitiesAsRead,
  getUnreadActivityCount,
  markActivityOverdueNotificationSent,
  getKanbanLeads,
};
