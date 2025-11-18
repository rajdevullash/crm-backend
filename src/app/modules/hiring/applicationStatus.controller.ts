import { Request, Response } from 'express';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ApplicationStatus } from './applicationStatus.model';
import { IApplicationStatus } from './applicationStatus.interface';

// Create application status
const createApplicationStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }
  
  // If setting as default, unset other defaults for the same department
  if (req.body.isDefault) {
    await ApplicationStatus.updateMany(
      { department: req.body.department || null, isDefault: true },
      { isDefault: false }
    );
  }

  const statusData = {
    name: req.body.name.toLowerCase().trim(),
    label: req.body.label,
    color: req.body.color || '#6b7280',
    department: req.body.department || null,
    order: req.body.order || 0,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    isDefault: req.body.isDefault || false,
    createdBy: {
      id: user.userId,
      name: user.name || 'Unknown',
      role: user.role,
    },
  };

  const status = await ApplicationStatus.create(statusData);

  sendResponse<IApplicationStatus>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Application status created successfully',
    data: status,
  });
});

// Get all application statuses (filter by department if provided)
const getAllApplicationStatuses = catchAsync(async (req: Request, res: Response) => {
  const { department } = req.query;
  
  const filter: any = { isActive: true };
  
  // If department is provided, get both global (null) and department-specific statuses
  if (department) {
    filter.$or = [
      { department: null }, // Global statuses
      { department: department }, // Department-specific statuses
    ];
  } else {
    // If no department specified, get all statuses
    filter.department = null; // Only global statuses by default
  }

  const statuses = await ApplicationStatus.find(filter).sort({ order: 1, label: 1 });

  sendResponse<IApplicationStatus[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Application statuses retrieved successfully',
    data: statuses,
  });
});

// Get single application status
const getSingleApplicationStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const status = await ApplicationStatus.findById(id);

  if (!status) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Application status not found',
      data: null,
    });
  }

  sendResponse<IApplicationStatus>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Application status retrieved successfully',
    data: status,
  });
});

// Update application status
const updateApplicationStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // If setting as default, unset other defaults for the same department
  if (req.body.isDefault) {
    const currentStatus = await ApplicationStatus.findById(id);
    if (currentStatus) {
      await ApplicationStatus.updateMany(
        { 
          _id: { $ne: id },
          department: currentStatus.department || null, 
          isDefault: true 
        },
        { isDefault: false }
      );
    }
  }

  const updateData: any = { ...req.body };
  if (updateData.name) {
    updateData.name = updateData.name.toLowerCase().trim();
  }

  const status = await ApplicationStatus.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!status) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Application status not found',
      data: null,
    });
  }

  sendResponse<IApplicationStatus>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Application status updated successfully',
    data: status,
  });
});

// Delete application status
const deleteApplicationStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Soft delete by setting isActive to false
  const status = await ApplicationStatus.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!status) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Application status not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Application status deleted successfully',
    data: null,
  });
});

export const ApplicationStatusController = {
  createApplicationStatus,
  getAllApplicationStatuses,
  getSingleApplicationStatus,
  updateApplicationStatus,
  deleteApplicationStatus,
};

