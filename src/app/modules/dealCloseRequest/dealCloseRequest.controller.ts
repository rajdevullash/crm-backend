import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DealCloseRequestService } from './dealCloseRequest.service';
import pick from '../../../shared/pick';
import { dealCloseRequestFilterableFields } from './dealCloseRequest.constant';

// Create close request
const createCloseRequest = catchAsync(async (req: Request, res: Response) => {
  const { leadId } = req.body;
  const representativeId = req.user?.userId;

  const result = await DealCloseRequestService.createCloseRequest(
    leadId,
    representativeId
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Close request submitted successfully',
    data: result,
  });
});

// Mark lead as lost
const markAsLost = catchAsync(async (req: Request, res: Response) => {
  const { leadId, lostReason } = req.body;
  const userId = req.user?.userId;

  if (!lostReason || lostReason.trim() === '') {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Lost reason is required',
    });
  }

  await DealCloseRequestService.markAsLost(leadId, lostReason, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Deal marked as lost successfully',
  });
});

// Get all close requests (Admin)
const getAllCloseRequests = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, dealCloseRequestFilterableFields);
  const paginationOptions = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);

  const result = await DealCloseRequestService.getAllCloseRequests(
    filters,
    paginationOptions
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Close requests retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Approve close request (Admin)
const approveCloseRequest = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { incentiveAmount } = req.body;
  const adminId = req.user?.userId;

  if (!incentiveAmount || incentiveAmount <= 0) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Valid incentive amount is required',
    });
  }

  const result = await DealCloseRequestService.approveCloseRequest(
    requestId,
    adminId,
    incentiveAmount
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Close request approved successfully',
    data: result,
  });
});

// Reject close request (Admin)
const rejectCloseRequest = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { rejectionReason } = req.body;
  const adminId = req.user?.userId;

  if (!rejectionReason || rejectionReason.trim() === '') {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Rejection reason is required',
    });
  }

  const result = await DealCloseRequestService.rejectCloseRequest(
    requestId,
    adminId,
    rejectionReason
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Close request rejected successfully',
    data: result,
  });
});

// Delete close request (when moving lead out of Won stage within grace period)
const deleteCloseRequest = catchAsync(async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const userId = req.user?.userId;

  const result = await DealCloseRequestService.deleteCloseRequest(leadId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Close request deleted successfully',
    data: result,
  });
});

export const DealCloseRequestController = {
  createCloseRequest,
  markAsLost,
  getAllCloseRequests,
  approveCloseRequest,
  rejectCloseRequest,
  deleteCloseRequest,
};
