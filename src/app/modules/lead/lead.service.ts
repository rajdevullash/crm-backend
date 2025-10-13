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

    // Update user's totalLeads count within transaction
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { totalLeads: 1 } },
      { new: true, session } // Pass session to include in transaction
    );

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    // Create lead within transaction (create with array returns array)
    const result = await Lead.create([payload], { session });

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
    // Default sort by creation date (newest first)
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
    .populate('notes.addedBy');
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  return result;
};

const updateLead = async (
  id: string,
  payload: Partial<ILead>,
): Promise<ILead | null> => {
  console.log('id', id);
  const existingLead = await Lead.findOne({ _id: id }).populate('stage');
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  // Check if stage is being updated
  if (payload.stage && payload.stage.toString() !== existingLead.stage?._id?.toString()) {
    // Get the new stage details
    const newStage = await Stage.findById(payload.stage);
    if (!newStage) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Stage not found');
    }

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

  // Perform the update in the database
  const result = await Lead.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

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

export const LeadService = {
  createLead,
  getAllLeads,
  getSpecificLead,
  updateLead,
  deleteLead,
};
