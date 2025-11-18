import { Request, Response } from 'express';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { Department } from './department.model';
import { IDepartment } from './department.interface';

// Create department (only admin/super admin)
const createDepartment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }
  
  const departmentData = {
    name: req.body.name,
    description: req.body.description,
    createdBy: {
      id: user.userId,
      name: user.name || 'Unknown',
      role: user.role,
    },
  };

  const department = await Department.create(departmentData);

  sendResponse<IDepartment>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Department created successfully',
    data: department,
  });
});

// Get all departments (filter by createdBy for admin/super admin)
const getAllDepartments = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  
  // If user is admin or super admin, show only departments created by admin/super admin
  // HR users can see all departments created by admin/super admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filter: any = {};
  if (user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'hr')) {
    filter = {
      'createdBy.role': { $in: ['admin', 'super_admin'] },
    };
  }

  const departments = await Department.find(filter).sort({ name: 1 });

  sendResponse<IDepartment[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Departments retrieved successfully',
    data: departments,
  });
});

// Get single department
const getSingleDepartment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const department = await Department.findById(id);

  if (!department) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Department not found',
      data: null,
    });
  }

  sendResponse<IDepartment>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Department retrieved successfully',
    data: department,
  });
});

// Update department (only admin/super admin)
const updateDepartment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  const department = await Department.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!department) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Department not found',
      data: null,
    });
  }

  sendResponse<IDepartment>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Department updated successfully',
    data: department,
  });
});

// Delete department (only admin/super admin)
const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const department = await Department.findByIdAndDelete(id);

  if (!department) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Department not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Department deleted successfully',
    data: null,
  });
});

export const DepartmentController = {
  createDepartment,
  getAllDepartments,
  getSingleDepartment,
  updateDepartment,
  deleteDepartment,
};

