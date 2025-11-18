import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IPayslip, IPayslipFilters } from './payslip.interface';
import { Payslip } from './payslip.model';
import { Resource } from '../resource/resource.model';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const generatePayslip = async (
  resourceId: string,
  month: string,
  year: number,
  userId?: string,
  userName?: string,
  userRole?: string,
  allowances?: Array<{ description: string; amount: number }>,
  deductions?: Array<{ description: string; amount: number }>
): Promise<IPayslip> => {
  console.log('PayslipService.generatePayslip called with:', {
    resourceId,
    month,
    year,
    allowances,
    deductions,
    allowancesType: typeof allowances,
    deductionsType: typeof deductions,
    allowancesIsArray: Array.isArray(allowances),
    deductionsIsArray: Array.isArray(deductions),
  });

  // Get resource details
  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found');
  }

  // Calculate total amount
  const baseSalary = resource.salary || 0;
  const allowancesTotal = allowances?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const deductionsTotal = deductions?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalAmount = baseSalary + allowancesTotal - deductionsTotal;

  console.log('Calculated totals:', {
    baseSalary,
    allowancesTotal,
    deductionsTotal,
    totalAmount,
    allowancesToSave: allowances || [],
    deductionsToSave: deductions || [],
  });

  // Create payslip
  const payslip = await Payslip.create({
    resourceId: resource._id?.toString() || resourceId,
    employeeId: resource.employeeId,
    employeeName: resource.name,
    month,
    year,
    date: new Date(),
    baseSalary,
    allowances: allowances || [],
    deductions: deductions || [],
    totalAmount,
    generatedBy: userId
      ? {
          id: userId,
          name: userName || 'System',
          role: userRole || 'system',
        }
      : undefined,
  });

  console.log('Payslip created:', {
    id: payslip._id,
    allowances: payslip.allowances,
    deductions: payslip.deductions,
  });

  return payslip;
};

const getAllPayslips = async (
  filters: IPayslipFilters,
  paginationOptions: IPaginationOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationHelpers.calculatePagination(paginationOptions);

  const { searchTerm, resourceId, employeeId, month, year, ...filterData } = filters;

  const andConditions: any[] = [];

  // Search functionality
  if (searchTerm) {
    andConditions.push({
      $or: [
        { employeeName: { $regex: searchTerm, $options: 'i' } },
        { employeeId: { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  // Filter by resourceId
  if (resourceId) {
    andConditions.push({ resourceId });
  }

  // Filter by employeeId
  if (employeeId) {
    andConditions.push({ employeeId });
  }

  // Filter by month
  if (month) {
    andConditions.push({ month });
  }

  // Filter by year
  if (year) {
    andConditions.push({ year });
  }

  // Apply other filters
  if (Object.keys(filterData).length > 0) {
    andConditions.push(filterData);
  }

  const whereConditions = andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Payslip.find(whereConditions)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await Payslip.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getSinglePayslip = async (id: string): Promise<IPayslip | null> => {
  const payslip = await Payslip.findById(id);
  return payslip;
};

const getPayslipsByResource = async (resourceId: string): Promise<IPayslip[]> => {
  const payslips = await Payslip.find({ resourceId }).sort({ year: -1, month: -1 });
  return payslips;
};

const deletePayslip = async (id: string): Promise<IPayslip | null> => {
  const payslip = await Payslip.findByIdAndDelete(id);
  return payslip;
};

export const PayslipService = {
  generatePayslip,
  getAllPayslips,
  getSinglePayslip,
  getPayslipsByResource,
  deletePayslip,
};

