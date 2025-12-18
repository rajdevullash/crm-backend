import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import { ShiftService } from './shift.service';

const createShift = catchAsync(async (req: Request, res: Response) => {
  const result = await ShiftService.createShift(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Shift created successfully',
    data: result,
  });
});

const getAllShifts = catchAsync(async (req: Request, res: Response) => {
  const result = await ShiftService.getAllShifts();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shifts fetched successfully',
    data: result,
  });
});

const updateShift = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ShiftService.updateShift(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift updated successfully',
    data: result,
  });
});

const deleteShift = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ShiftService.deleteShift(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift deleted successfully',
    data: result,
  });
});

export const ShiftController = {
  createShift,
  getAllShifts,
  updateShift,
  deleteShift,
};
