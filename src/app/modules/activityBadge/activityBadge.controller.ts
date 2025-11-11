import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import {
  getActivityBadgeStatus,
  markActivityBadgeAsViewed,
} from './activityBadge.service';

// Get activity badge status for current user
const getBadgeStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: 'User not authenticated',
    });
  }

  const status = await getActivityBadgeStatus(userId, userRole);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Activity badge status retrieved successfully',
    data: status,
  });
});

// Mark activity badge as viewed
const markAsViewed = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: 'User not authenticated',
    });
  }

  const success = await markActivityBadgeAsViewed(userId);

  if (success) {
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Activity badge marked as viewed',
      data: { viewed: true },
    });
  } else {
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'Failed to mark badge as viewed',
    });
  }
});

export const ActivityBadgeController = {
  getBadgeStatus,
  markAsViewed,
};

