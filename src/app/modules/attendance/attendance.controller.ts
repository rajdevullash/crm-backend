import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import { AttendanceService } from './attendance.service';
import pick from '../../../shared/pick';

const checkIn = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.checkIn(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Checked in successfully',
    data: result,
  });
});

const checkOut = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.checkOut(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checked out successfully',
    data: result,
  });
});

const getAllAttendance = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'date', 'department', 'status', 'employeeId']);
  const paginationOptions = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);

  const result = await AttendanceService.getAllAttendance(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Attendance records fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getDailyStats = catchAsync(async (req: Request, res: Response) => {
  const date = req.query.date ? new Date(req.query.date as string) : new Date();
  const result = await AttendanceService.getDailyStats(date);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Daily stats fetched successfully',
    data: result,
  });
});

export const AttendanceController = {
  checkIn,
  checkOut,
  getAllAttendance,
  getDailyStats,
};
