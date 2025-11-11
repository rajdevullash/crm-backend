/* eslint-disable @typescript-eslint/no-explicit-any */
import { IDealCloseRequest, IDealCloseRequestFilters } from './dealCloseRequest.interface';
import { DealCloseRequest } from './dealCloseRequest.model';
import { Lead } from '../lead/lead.model';
import { User } from '../auth/auth.model';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IGenericResponse } from '../../../interfaces/common';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { dealCloseRequestSearchableFields } from './dealCloseRequest.constant';
import { Stage } from '../stage/stage.model';

// Create a new deal close request
const createCloseRequest = async (
  leadId: string,
  representativeId: string
): Promise<IDealCloseRequest> => {
  // Check if lead exists and populate stage to get the current stage
  const lead = await Lead.findById(leadId).populate('stage');
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  // Check if lead is already closed or has pending request
  if (lead.dealStatus === 'closed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Deal is already closed');
  }
  
  if (lead.dealStatus === 'closing_requested') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Close request already submitted for this deal');
  }

  if (lead.dealStatus === 'lost') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Deal is marked as lost');
  }

  // Check if lead is assigned to this representative
  if (lead.assignedTo?.toString() !== representativeId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not assigned to this lead');
  }

  // Get the current stage (previous stage before moving to Won/deal closing)
  // This will be used to restore the lead if the request is rejected
  // Handle both populated and non-populated stage
  const previousStageId = lead.stage 
    ? (lead.stage._id ? lead.stage._id : lead.stage)
    : null;

  // Create close request with previous stage information
  const closeRequest = await DealCloseRequest.create({
    lead: leadId,
    representative: representativeId,
    requestedAt: new Date(),
    status: 'pending',
    previousStage: previousStageId,
  });

  // Update lead status and clear any previous rejection reason
  await Lead.findByIdAndUpdate(leadId, {
    dealStatus: 'closing_requested',
    closingRequestedAt: new Date(),
    dealRejectionReason: undefined, // Clear previous rejection reason if resubmitted
  });

  // Add to history
  await Lead.findByIdAndUpdate(leadId, {
    $push: {
      history: {
        action: 'deal_close_requested',
        changedBy: representativeId,
        timestamp: new Date(),
        description: 'Representative requested to close this deal',
      },
    },
  });

  return closeRequest;
};

// Mark lead as lost
const markAsLost = async (
  leadId: string,
  lostReason: string,
  userId: string
): Promise<void> => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  if (lead.dealStatus === 'closed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Deal is already closed');
  }

  if (lead.dealStatus === 'lost') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Deal is already marked as lost');
  }

  // If there's a pending close request, reject it
  if (lead.dealStatus === 'closing_requested') {
    await DealCloseRequest.findOneAndUpdate(
      { lead: leadId, status: 'pending' },
      {
        status: 'rejected',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: 'Deal marked as lost',
      }
    );
  }

  await Lead.findByIdAndUpdate(leadId, {
    dealStatus: 'lost',
    lostReason,
  });

  // ✅ ADD THIS: Remove from convertedLeads if present
 await Lead.findById(leadId);
  if (lead) {
    const targetUserId = lead.assignedTo || lead.createdBy;
    if (targetUserId) {
      await User.findOneAndUpdate(
        { _id: targetUserId },
        { 
          $pull: { 
            convertedLeads: leadId 
          }
        }
      );
      console.log(`Removed lost lead from convertedLeads for user: ${targetUserId}`);
    }
  }

  // Add to history
  await Lead.findByIdAndUpdate(leadId, {
    $push: {
      history: {
        action: 'deal_lost',
        changedBy: userId,
        timestamp: new Date(),
        description: `Deal marked as lost. Reason: ${lostReason}`,
      },
    },
  });
};

// Get all pending close requests (Admin)
const getAllCloseRequests = async (
  filters: IDealCloseRequestFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IDealCloseRequest[]>> => {
  const { searchTerm, ...filtersData } = filters;

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: dealCloseRequestSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === 'asc' ? 1 : -1;
  } else {
    sortConditions['requestedAt'] = -1; // Default sort by newest first
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await DealCloseRequest.find(whereConditions)
    .populate('lead')
    .populate('representative', 'name email profileImage incentivePercentage')
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email')
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await DealCloseRequest.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// Approve close request (Admin)
const approveCloseRequest = async (
  requestId: string,
  adminId: string,
  incentiveAmount: number
): Promise<IDealCloseRequest> => {
  const closeRequest = await DealCloseRequest.findById(requestId).populate('lead');
  if (!closeRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Close request not found');
  }

  if (closeRequest.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Close request is already processed');
  }

  // Update close request
  closeRequest.status = 'approved';
  closeRequest.approvedBy = adminId as any;
  closeRequest.approvedAt = new Date();
  closeRequest.incentiveAmount = incentiveAmount; // This is the BDT amount from frontend
  closeRequest.incentiveCurrency = 'BDT'; // Always store as BDT
  await closeRequest.save();

  // Update lead
  await Lead.findByIdAndUpdate(closeRequest.lead, {
    dealStatus: 'closed',
    closedAt: new Date(),
    closedBy: adminId,
  });

  // lead stage id update to won
  // If you maintain a separate Stage model/collection, import it and update the stage here.
  // Removed direct reference to an undefined `stages` variable to avoid runtime/compile errors.
  // Example (uncomment and adjust import if you have a Stage model):
  const wonStage = await Stage.findOne({ title: /won/i });
  if (wonStage) {
    await Lead.findByIdAndUpdate(closeRequest.lead, { stage: wonStage._id });
  }
  // No-op if no Stage model is available.

  // Add to history
  await Lead.findByIdAndUpdate(closeRequest.lead, {
    $push: {
      history: {
        action: 'deal_closed',
        changedBy: adminId,
        timestamp: new Date(),
        description: `Deal closed by admin. Incentive: ৳${incentiveAmount.toFixed(2)} BDT`,
      },
    },
  });

  // Get representative's incentive percentage
  const representative = await User.findById(closeRequest.representative);
  if (representative && representative.incentivePercentage) {
    // You can add logic here to track incentive earnings
    console.log(`Incentive earned: ৳${incentiveAmount.toFixed(2)} BDT for representative ${representative.name}`);
  }

  // Update representative's convertedLeads array when deal is approved
  if (representative && closeRequest.lead) {
    console.log('Adding lead to representative convertedLeads array');
    
    // Migrate old data structure if convertedLeads is not an array
    if (!Array.isArray(representative.convertedLeads)) {
      console.log('Converting convertedLeads from number to array...');
      await User.findOneAndUpdate(
        { _id: representative._id },
        { $set: { convertedLeads: [] } },
        { new: true }
      );
      representative.convertedLeads = [];
    }
    
    // Check if this lead is already counted in convertedLeads
    const isAlreadyCounted = representative.convertedLeads?.some(
      (leadEntry: any) => {
        const leadId = typeof leadEntry === 'object' && leadEntry._id 
          ? leadEntry._id.toString() 
          : leadEntry?.toString();
        return leadId === closeRequest.lead.toString();
      }
    );

    if (!isAlreadyCounted) {
      console.log(`Adding lead ${closeRequest.lead} to converted leads for representative: ${representative.name}`);
      
      // Add the lead to convertedLeads array
      await User.findOneAndUpdate(
        { _id: representative._id },
        { 
          $push: { 
            convertedLeads: closeRequest.lead 
          }
        },
        { new: true }
      );
      
      console.log('Successfully tracked lead conversion for representative');
    } else {
      console.log('Lead already counted in converted leads for representative');
    }
  }

  return closeRequest;
};

// Reject close request (Admin)
const rejectCloseRequest = async (
  requestId: string,
  adminId: string,
  rejectionReason: string
): Promise<IDealCloseRequest> => {
  const closeRequest = await DealCloseRequest.findById(requestId);
  if (!closeRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Close request not found');
  }

  if (closeRequest.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Close request is already processed');
  }

  // Update close request
  closeRequest.status = 'rejected';
  closeRequest.rejectedBy = adminId as any;
  closeRequest.rejectedAt = new Date();
  // Rejection reason is optional now
  if (rejectionReason && rejectionReason.trim() !== '') {
    closeRequest.rejectionReason = rejectionReason;
  }
  
  console.log('💾 Saving close request rejection to database:', {
    requestId: closeRequest._id,
    rejectionReason: closeRequest.rejectionReason || 'No reason provided',
    rejectedBy: adminId,
  });
  
  await closeRequest.save();
  
  console.log('✅ Close request rejected successfully');

  // Get the lead to check current stage and restore previous stage
  const lead = await Lead.findById(closeRequest.lead);
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  // Update lead status back to open and store rejection reason
  const updateData: any = {
    dealStatus: 'open',
    closingRequestedAt: undefined,
    // If no specific reason provided, use default message
    dealRejectionReason: (rejectionReason && rejectionReason.trim() !== '') ? rejectionReason : 'Rejected by admin',
  };

  // Restore the lead to its previous stage (the stage it was in before requesting to close)
  // If previousStage exists in the close request, use it; otherwise keep current stage
  if (closeRequest.previousStage) {
    updateData.stage = closeRequest.previousStage;
    console.log(`🔄 Restoring lead to previous stage: ${closeRequest.previousStage}`);
  } else {
    // Fallback: if previousStage is not stored, keep the current stage
    // This handles cases where previousStage wasn't stored (backward compatibility)
    console.log('⚠️ No previous stage stored in close request, keeping current stage');
  }

  console.log('💾 Updating lead with rejection reason:', {
    leadId: closeRequest.lead,
    dealRejectionReason: updateData.dealRejectionReason,
  });

  await Lead.findByIdAndUpdate(closeRequest.lead, updateData);

  // Remove lead from convertedLeads array if it was prematurely added
  // This ensures proper cleanup when deal close request is rejected
  console.log('🗑️ Removing lead from convertedLeads arrays (if present)');
  const removedFromUsers = await User.updateMany(
    { convertedLeads: closeRequest.lead },
    { 
      $pull: { convertedLeads: closeRequest.lead } 
    }
  );

  if (removedFromUsers.modifiedCount > 0) {
    console.log(`✅ Removed lead from ${removedFromUsers.modifiedCount} user(s) convertedLeads arrays`);
  }

  // Add to history
  const historyDescription = rejectionReason && rejectionReason.trim() !== ''
    ? `Close request rejected by admin. Reason: ${rejectionReason}. Lead restored to previous stage. Removed from converted leads.`
    : `Close request rejected by admin. Lead restored to previous stage. Removed from converted leads.`;
  
  await Lead.findByIdAndUpdate(closeRequest.lead, {
    $push: {
      history: {
        action: 'deal_close_rejected',
        changedBy: adminId,
        timestamp: new Date(),
        description: historyDescription,
      },
    },
  });

  // Populate the close request before returning
  const populatedCloseRequest = await DealCloseRequest.findById(closeRequest._id)
    .populate('lead')
    .populate('representative', 'name email profileImage incentivePercentage')
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email');

  if (!populatedCloseRequest) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch updated close request');
  }

  console.log('📤 Returning populated close request:', {
    id: populatedCloseRequest._id,
    status: populatedCloseRequest.status,
    rejectionReason: populatedCloseRequest.rejectionReason,
    rejectedBy: populatedCloseRequest.rejectedBy,
  });

  return populatedCloseRequest;
};

// Delete close request (when moving lead out of Won stage within grace period)
const deleteCloseRequest = async (
  leadId: string,
  userId: string
): Promise<void> => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  // Check if there's a close request for this lead
  const closeRequest = await DealCloseRequest.findOne({
    lead: leadId,
    status: 'pending',
  });

  if (!closeRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No pending close request found for this lead');
  }

  // Check 1-hour grace period
  const requestedAt = new Date(closeRequest.requestedAt).getTime();
  const currentTime = new Date().getTime();
  const oneHourInMs = 60 * 60 * 1000;

  if (currentTime - requestedAt > oneHourInMs) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Cannot delete close request after 1 hour grace period has expired'
    );
  }

  // Remove lead from convertedLeads array if it was already added
  // This ensures proper cleanup when deal close request is deleted
  console.log('🗑️ Removing lead from convertedLeads arrays (if present)');
  const removedFromUsers = await User.updateMany(
    { convertedLeads: leadId },
    { 
      $pull: { convertedLeads: leadId } 
    }
  );

  if (removedFromUsers.modifiedCount > 0) {
    console.log(`✅ Removed lead from ${removedFromUsers.modifiedCount} user(s) convertedLeads arrays`);
  }

  // Delete the close request
  await DealCloseRequest.findByIdAndDelete(closeRequest._id);

  // Update lead status back to open
  await Lead.findByIdAndUpdate(leadId, {
    dealStatus: 'open',
    closingRequestedAt: undefined,
  });

  // Add to history
  await Lead.findByIdAndUpdate(leadId, {
    $push: {
      history: {
        action: 'deal_close_request_deleted',
        changedBy: userId,
        timestamp: new Date(),
        description: 'Close request deleted within grace period. Removed from converted leads.',
      },
    },
  });
};

// Get approved close requests for a representative
const getApprovedRequestsForRepresentative = async (
  representativeId: string
): Promise<IDealCloseRequest[]> => {
  const result = await DealCloseRequest.find({
    representative: representativeId,
    status: 'approved',
  })
    .populate('lead')
    .populate('representative', 'name email profileImage incentivePercentage')
    .populate('approvedBy', 'name email')
    .sort({ approvedAt: -1 });

  return result;
};

export const DealCloseRequestService = {
  createCloseRequest,
  markAsLost,
  getAllCloseRequests,
  approveCloseRequest,
  rejectCloseRequest,
  deleteCloseRequest,
  getApprovedRequestsForRepresentative,
};
