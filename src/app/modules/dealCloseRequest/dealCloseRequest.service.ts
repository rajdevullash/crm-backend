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
  // Check if lead exists
  const lead = await Lead.findById(leadId);
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

  // Create close request
  const closeRequest = await DealCloseRequest.create({
    lead: leadId,
    representative: representativeId,
    requestedAt: new Date(),
    status: 'pending',
  });

  // Update lead status
  await Lead.findByIdAndUpdate(leadId, {
    dealStatus: 'closing_requested',
    closingRequestedAt: new Date(),
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
  closeRequest.rejectionReason = rejectionReason;
  await closeRequest.save();

  // Update lead status back to open
  await Lead.findByIdAndUpdate(closeRequest.lead, {
    dealStatus: 'open',
    closingRequestedAt: undefined,
  });

  // If you maintain a separate Stage model/collection, import it and update the stage here.
  const lostStage = await Stage.findOne({ title: /lost/i });
  if (lostStage) {
    await Lead.findByIdAndUpdate(closeRequest.lead, { stage: lostStage._id });
  }

  // Add to history
  await Lead.findByIdAndUpdate(closeRequest.lead, {
    $push: {
      history: {
        action: 'deal_close_rejected',
        changedBy: adminId,
        timestamp: new Date(),
        description: `Close request rejected. Reason: ${rejectionReason}`,
      },
    },
  });

  return closeRequest;
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
        description: 'Close request deleted within grace period',
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
