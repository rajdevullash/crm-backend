// Your controller code here
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { ITask } from './task.interface';
import { taskFilterableFields } from './task.constant';
import { TaskService } from './task.service';
import { emitTaskEvent } from '../socket/socketService';

const createTask = catchAsync(async (req: Request, res: Response) => {
  console.log('taskControllerData', req.body);

  const createdBy = req?.user?.userId;
  req.body.createdBy = createdBy;
  
  const result = await TaskService.createTask(req.body);

 if(result){
  console.log('New Task Created:', result);
  // Prepare task data to send in the notification
   const taskData = {
    _id: result._id,
    title: result.title,
    description: result.description,
    lead: result.lead,
    assignTo: result.assignTo,
    status: result.status,
    dueDate: result.dueDate,
    createdBy: result.createdBy,
    performancePoint: result.performancePoint,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };

  // Determine who should receive this notification
  const targetRooms = [
    `user_${createdBy}`, // The creator
    `role_admin`, // All admins
    `role_super_admin`
  ];
  
  // If task is assigned to someone, add them to the recipients
  if (result.assignTo && result.assignTo !== createdBy) {
    targetRooms.push(`user_${result.assignTo}`);
  }

  emitTaskEvent('task:created', {
    message: `New task "${result.title}" created`,
    task: taskData,
    user: {
      id: req.user?.userId,
      name: req.user?.name,
      role: req.user?.role,
    },
    timestamp: new Date().toISOString(),
  }, targetRooms);
 }

  sendResponse<ITask>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Task created successfully',
    data: result,
  });
});

//get all tasks

const getAllTasks = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, taskFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const role = req.user?.role;
  const userId = req.user?.userId;
  const result = await TaskService.getAllTasks(
    filters,
    paginationOptions,
    role,
    userId
  );

  sendResponse<ITask[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tasks fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

//get specific task

const getSpecificTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TaskService.getSpecificTask(id);
  sendResponse<ITask>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task fetched successfully',
    data: result,
  });
});

//update task

const updateTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

 
  const existingTask = await TaskService.getSpecificTask(id);
  if (existingTask && existingTask.status === 'completed' && req.body.status === 'pending') {
    const currentDate = new Date();
    if (existingTask.dueDate < currentDate) {
      req.body.performancePoint = existingTask.performancePoint * 0.5;
    }
  }

  const result = await TaskService.updateTask(id, req.body);
  sendResponse<ITask>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task updated successfully',
    data: result,
  });
});

//delete task

const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await TaskService.deleteTask(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task deleted successfully',
  });
});

export const TaskController = {
  createTask,
  getAllTasks,
  getSpecificTask,
  updateTask,
  deleteTask,
};