
// Your controller code here

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { stageFilterableFields } from './stage.constant';
import { IStage } from './stage.interface';
import { StageService } from './stage.service';
import { emitStageEvent } from '../socket/socketService';

const createStage = catchAsync(async (req: Request, res: Response) => {
    const requestedUser = req.user?.userId;
    console.log('Requested User ID:', requestedUser); // Debugging line
  const data = {
    ...req.body,
    createdBy: requestedUser,
  };

  const result = await StageService.createStage(data);

  sendResponse<IStage>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Stage created successfully',
    data: result,
  });
});

//get all stages

const getAllStages = catchAsync(async (req: Request, res: Response) => {
    const filters = pick(req.query, stageFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
    const result = await StageService.getAllStages(
      filters,
      paginationOptions,
    );
    
  sendResponse<IStage[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stages retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

//get single stage
const getSingleStage = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await StageService.getSingleStage(id);
  sendResponse<IStage>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stage retrieved successfully',
    data: result,
  });
});

//update stage
const updateStage = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const data = req.body;
  const result = await StageService.updateStage(id, data);
  sendResponse<IStage>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stage updated successfully',
    data: result,
  });
});

//delete stage
const deleteStage = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await StageService.deleteStage(id);
  sendResponse<IStage>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stage deleted successfully',
    data: result,
  });
});

//reorder stages

const reorderStages = catchAsync(async (req: Request, res: Response) => {
  const { sourceIndex, destinationIndex } = req.body;
  const userRole = req.user?.role;
  console.log('Reorder Request Body:', req.body);
  
  const result = await StageService.reorderStages(sourceIndex, destinationIndex);
  
  // Emit socket event to notify all connected clients about stage reorder
  if (result) {
    console.log('📊 Stages reordered, emitting socket event');
    
    // Target rooms based on user role
    const targetRooms = 
      userRole === 'representative' 
        ? ['role_representative']
        : ['role_admin', 'role_super_admin', 'role_representative'];
    
    emitStageEvent('stages:reordered', {
      message: 'Stages reordered successfully',
      data: result,
      timestamp: new Date().toISOString(),
    }, targetRooms);
  }
  
  sendResponse<IStage[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stages reordered successfully',
    data: result,
  });
});

export const StageController = {
  createStage,
  getAllStages,
  getSingleStage,
  updateStage,
  deleteStage,
  reorderStages,
};

// Your controller code ends here
