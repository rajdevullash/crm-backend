import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PayslipService } from './payslip.service';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';

const generatePayslip = catchAsync(async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  const { resourceId, month, year, allowances, deductions } = req.body;

  console.log('Backend received payslip data:', {
    resourceId,
    month,
    year,
    allowances,
    deductions,
    allowancesType: typeof allowances,
    deductionsType: typeof deductions,
    allowancesLength: Array.isArray(allowances) ? allowances.length : 'not array',
    deductionsLength: Array.isArray(deductions) ? deductions.length : 'not array',
  });

  if (!resourceId || !month || !year) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'Resource ID, month, and year are required',
      data: null,
    });
  }

  const result = await PayslipService.generatePayslip(
    resourceId,
    month,
    year,
    user?.userId,
    user?.name,
    user?.role,
    allowances,
    deductions
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Payslip generated successfully',
    data: result,
  });
});

const getAllPayslips = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['resourceId', 'employeeId', 'month', 'year', 'searchTerm']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await PayslipService.getAllPayslips(filters, paginationOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payslips retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSinglePayslip = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await PayslipService.getSinglePayslip(id);

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Payslip not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payslip retrieved successfully',
    data: result,
  });
});

const getPayslipsByResource = catchAsync(async (req: Request, res: Response) => {
  const { resourceId } = req.params;

  const result = await PayslipService.getPayslipsByResource(resourceId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payslips retrieved successfully',
    data: result,
  });
});

const deletePayslip = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await PayslipService.deletePayslip(id);

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Payslip not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payslip deleted successfully',
    data: result,
  });
});

export const PayslipController = {
  generatePayslip,
  getAllPayslips,
  getSinglePayslip,
  getPayslipsByResource,
  deletePayslip,
};

