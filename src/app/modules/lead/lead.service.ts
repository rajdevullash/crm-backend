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

const createLead = async (payload: ILead): Promise<ILead | null> => {
  // Start a Mongoose session for transaction
  const session = await mongoose.startSession();
  
  try {
    // Start transaction
    session.startTransaction();

    // Validate userId
    const userId = payload.createdBy;
    if (!userId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'createdBy is required');
    }

    // ✅ If stage is not provided or is null/empty, set the first stage as default
    if (!payload.stage || payload.stage.toString() === '') {
      const firstStage = await Stage.findOne({ isActive: true }).sort({ position: 1 }).session(session);
      if (firstStage) {
        payload.stage = firstStage._id;
        console.log(`No stage provided. Setting default stage: ${firstStage.title} (${firstStage._id})`);
      } else {
        throw new ApiError(httpStatus.NOT_FOUND, 'No active stage found. Please create a stage first.');
      }
    }

    // Update user's totalLeads count within transaction
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { totalLeads: 1 } },
      { new: true, session } // Pass session to include in transaction
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

    // Create lead within transaction (create with array returns array)
    const result = await Lead.create([leadDataWithHistory], { session });

    // Commit transaction if everything succeeds
    await session.commitTransaction();
    
    return result[0];
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    throw error;
  } finally {
    // End session
    session.endSession();
  }
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
    andConditions.push({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ]
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

  // Check if activities are being added
  if (payload.activities && Array.isArray(payload.activities)) {
    const existingActivitiesCount = existingLead.activities?.length || 0;
    const newActivitiesCount = payload.activities.length;
    
    if (newActivitiesCount > existingActivitiesCount) {
      // New activity was added
      const newActivity = payload.activities[payload.activities.length - 1];
      const activityType = newActivity.type || 'activity';
      historyEntries.push({
        action: 'activity_added',
        field: 'activities',
        newValue: activityType,
        changedBy: currentUserId,
        timestamp: new Date(),
        description: `Added a new ${activityType} activity`
      });
    } else if (newActivitiesCount < existingActivitiesCount) {
      // Activity was deleted
      historyEntries.push({
        action: 'activity_deleted',
        field: 'activities',
        changedBy: currentUserId,
        timestamp: new Date(),
        description: 'Deleted an activity'
      });
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

  return result;
};

//delete lead
const deleteLead = async (id: string): Promise<ILead | null> => {
  // Start a Mongoose session for transaction
  const session = await mongoose.startSession();

  try {
    // Start transaction
    session.startTransaction();

    // Find the lead to delete
    const existingLead = await Lead.findOne({ _id: id }).session(session);
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
        { new: true, session }
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
      },
      { session }
    );

    if (usersWithConvertedLead.modifiedCount > 0) {
      console.log(`Removed lead from ${usersWithConvertedLead.modifiedCount} user(s) convertedLeads arrays`);
    }

    // Step 3: Delete associated tasks
    const deletedTasks = await Task.deleteMany(
      { lead: existingLead._id },
      { session }
    );
    
    console.log(`Deleted ${deletedTasks.deletedCount} associated tasks`);

    // Step 4: Delete the lead
    const deletedLead = await Lead.findOneAndDelete(
      { _id: id },
      { session }
    );

    if (!deletedLead) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found during deletion');
    }

    // Commit transaction if all operations succeed
    await session.commitTransaction();
    console.log('✅ Lead deletion completed successfully');

    return deletedLead;
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    console.error('❌ Lead deletion failed, transaction rolled back:', error);
    throw error;
  } finally {
    // End session
    session.endSession();
  }
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
  if (role === 'representative') {
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

export const LeadService = {
  createLead,
  getAllLeads,
  getSpecificLead,
  updateLead,
  deleteLead,
  reorderLeads,
  getAllActivities,
};
