import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import { standaloneActivityService } from './standaloneActivity.service';
import { IStandaloneActivityFilters } from './standaloneActivity.interface';
import ApiError from '../../../errors/ApiError';

const createStandaloneActivity = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId || req.user?.id;
  
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  // Handle file upload if present
  const file = req.file;
  const payload = {
    ...req.body,
    addedBy: userId,
  };

  // If a file is uploaded, add the file path to payload
  if (file) {
    payload.customAttachment = `/uploads/standalone-activities/${file.filename}`;
  }

  const activity = await standaloneActivityService.createStandaloneActivity(payload);
  
  res.status(httpStatus.CREATED).json({
    success: true,
    data: activity,
  });
});

const getAllStandaloneActivities = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId || req.user?.id;
  const filters: IStandaloneActivityFilters = {
    addedBy: req.query.addedBy as string,
    type: req.query.type as 'call' | 'meeting' | 'email' | 'custom',
    completed: req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
  };

  const activities = await standaloneActivityService.getAllStandaloneActivities(filters, userId);
  
  res.status(httpStatus.OK).json({
    success: true,
    data: activities,
  });
});

const getStandaloneActivityById = catchAsync(async (req: Request, res: Response) => {
  const activity = await standaloneActivityService.getStandaloneActivityById(req.params.id);
  
  res.status(httpStatus.OK).json({
    success: true,
    data: activity,
  });
});

const updateStandaloneActivity = catchAsync(async (req: Request, res: Response) => {
  // Handle file upload if present
  const file = req.file;
  const updateData: any = { ...req.body };

  // If a file is uploaded, add the file path to update data
  if (file) {
    updateData.customAttachment = `/uploads/standalone-activities/${file.filename}`;
  } else if (req.body.customAttachment === null || req.body.customAttachment === '') {
    // If customAttachment is explicitly set to null or empty string, remove it
    updateData.customAttachment = null;
  }
  // If no file and customAttachment is not in body, it will be preserved (not included in updateData)

  const activity = await standaloneActivityService.updateStandaloneActivity(req.params.id, updateData);
  
  res.status(httpStatus.OK).json({
    success: true,
    data: activity,
  });
});

const deleteStandaloneActivity = catchAsync(async (req: Request, res: Response) => {
  await standaloneActivityService.deleteStandaloneActivity(req.params.id);
  
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Activity deleted successfully',
  });
});

export const standaloneActivityController = {
  createStandaloneActivity,
  getAllStandaloneActivities,
  getStandaloneActivityById,
  updateStandaloneActivity,
  deleteStandaloneActivity,
};

