/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';

import ApiError from '../../../errors/ApiError';
import { IResource, IResourceFilters } from './resource.interface';
import { Resource } from './resource.model';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { resourceSearchableFields, resourceFilterableFields } from './resource.constant';
import { User } from '../auth/auth.model';
import bcrypt from 'bcrypt';
import config from '../../../config';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { AuthService } from '../auth/auth.service';

const generateEmployeeId = async (): Promise<string> => {
  // Generate employee ID like EMP-00001
  const count = await Resource.countDocuments();
  const employeeId = `EMP-${String(count + 1).padStart(5, '0')}`;
  return employeeId;
};

const createResource = async (resourceData: Partial<IResource>, userId?: string, userName?: string, userRole?: string): Promise<IResource> => {
  // Generate employee ID if not provided
  if (!resourceData.employeeId) {
    resourceData.employeeId = await generateEmployeeId();
  }

  // Check if employee ID already exists
  const existingEmployeeId = await Resource.findOne({ employeeId: resourceData.employeeId });
  if (existingEmployeeId) {
    throw new ApiError(httpStatus.CONFLICT, 'Employee ID already exists');
  }

  // Check if email already exists
  const existingEmail = await Resource.findOne({ email: resourceData.email });
  if (existingEmail) {
    throw new ApiError(httpStatus.CONFLICT, 'Email already exists');
  }

  // Ensure required fields
  if (!resourceData.workMode || !resourceData.jobType || !resourceData.position || !resourceData.department) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required job information fields');
  }

  // Check if salary is provided (optional for initial creation, but required in model)
  if (resourceData.salary === undefined || resourceData.salary === null) {
    resourceData.salary = 0; // Set default to 0 if not provided
  }

  // Don't track initial creation in history - only track changes after creation
  // History will be empty initially and will be populated when updates are made
  const resource = await Resource.create({
    ...resourceData,
    jobHistory: [], // Empty initially - will track changes on updates
    salaryHistory: [], // Empty initially - will track changes on updates
    positionHistory: [], // Empty initially - will track changes on updates
    createdBy: userId ? { id: userId, name: userName || 'System', role: userRole || 'system' } : undefined,
  });

  // Create user automatically when resource is created
  let userCreated = false;
  let userLinked = false;
  
  if (resource.email && resource.name && resource.phone) {
    try {
      // Check if user already exists by email or phone
      const existingUserByEmail = await User.findOne({ email: resource.email });
      const existingUserByPhone = await User.findOne({ phone: resource.phone });
      
      if (existingUserByEmail || existingUserByPhone) {
        // User already exists (by email or phone), just link it
        const existingUser = existingUserByEmail || existingUserByPhone;
        if (existingUser) {
          resource.userId = existingUser._id?.toString();
          await resource.save();
          userLinked = true;
          console.log(`✅ Linked existing user (${existingUser.email}) to resource: ${resource.name}`);
        }
      } else {
        // User doesn't exist, create new user
        // Hash password (default password: 12345678)
        const hashedPassword = await bcrypt.hash('12345678', Number(config.bycrypt_salt_rounds));
        
        // Determine role based on department
        let userRole = ENUM_USER_ROLE.REPRESENTATIVE; // Default role
        if (resource.department) {
          const department = resource.department.toLowerCase();
          if (department === 'hr' || department === 'human resources') {
            userRole = ENUM_USER_ROLE.HR;
          } else if (department === 'engineering' || department === 'sales') {
            userRole = ENUM_USER_ROLE.REPRESENTATIVE;
          }
          // For other departments, use default REPRESENTATIVE
        }
        
        // Create user
        const user = await User.create({
          name: resource.name,
          email: resource.email,
          phone: resource.phone,
          password: hashedPassword,
          role: userRole,
        });

        // Update resource with user ID
        resource.userId = user._id?.toString();
        await resource.save();
        userCreated = true;
        console.log(`✅ User created and linked to resource: ${resource.name} (Email: ${resource.email}, Default Password: 12345678)`);
      }
    } catch (error: any) {
      console.error('Error creating user for resource:', error);
      // If it's a duplicate key error, try to find and link existing user
      if (error.code === 11000) {
        try {
          // Duplicate key error (email or phone already exists)
          const existingUser = await User.findOne({ 
            $or: [
              { email: resource.email },
              { phone: resource.phone }
            ]
          });
          if (existingUser) {
            resource.userId = existingUser._id?.toString();
            await resource.save();
            userLinked = true;
            console.log(`✅ Linked existing user to resource after duplicate error: ${resource.name}`);
          }
        } catch (linkError) {
          console.error('Error linking existing user:', linkError);
        }
      }
      // Don't fail resource creation if user creation fails - resource is already created
    }
  } else {
    console.warn(`⚠️ Cannot create user for resource ${resource.name}: Missing email, name, or phone`);
  }

  // Add user creation status to resource object for logging
  (resource as any).__userCreated = userCreated;
  (resource as any).__userLinked = userLinked;

  return resource;
};

const getAllResources = async (filters: IResourceFilters, paginationOptions: IPaginationOptions) => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } = paginationHelpers.calculatePagination(paginationOptions);

  const conditions: any = {};

  // Search term
  if (searchTerm) {
    conditions.$or = resourceSearchableFields.map((field) => ({
      [field]: { $regex: searchTerm, $options: 'i' },
    }));
  }

  // Other filters
  Object.keys(filterData).forEach((key) => {
    if (resourceFilterableFields.includes(key)) {
      conditions[key] = (filterData as any)[key];
    }
  });

  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === 'asc' ? 1 : -1;
  } else {
    sortConditions.createdAt = -1; // Default sort by created date
  }

  const result = await Resource.find(conditions).sort(sortConditions).skip(skip).limit(limit);
  const total = await Resource.countDocuments(conditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getSingleResource = async (id: string): Promise<IResource | null> => {
  const resource = await Resource.findById(id);
  return resource;
};

const getResourceByUserId = async (userId: string): Promise<IResource | null> => {
  const resource = await Resource.findOne({ userId });
  return resource;
};

const updateResource = async (
  id: string,
  updateData: Partial<IResource>,
  userId?: string,
  userName?: string,
  userRole?: string
): Promise<IResource | null> => {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found');
  }

  // Check if employee ID is being updated and if it already exists (excluding current resource)
  if (updateData.employeeId && updateData.employeeId !== resource.employeeId) {
    const existingEmployeeId = await Resource.findOne({ 
      employeeId: updateData.employeeId,
      _id: { $ne: id } // Exclude current resource
    });
    if (existingEmployeeId) {
      throw new ApiError(httpStatus.CONFLICT, 'Employee ID already exists');
    }
  }

  // Track changes for history - only track actual changes, not initial setup
  const changes: {
    workMode?: boolean;
    jobType?: boolean;
    jobStatus?: boolean;
    salary?: boolean;
    position?: boolean;
    department?: boolean;
  } = {};

  // Check if this is the first update
  // First update = resource has never been updated before (updatedAt === createdAt or very close)
  // After first update, we should track all subsequent changes
  const createdAt = resource.createdAt ? new Date(resource.createdAt).getTime() : Date.now();
  const updatedAt = resource.updatedAt ? new Date(resource.updatedAt).getTime() : createdAt;
  const timeDifference = Math.abs(updatedAt - createdAt);
  const hasBeenUpdatedBefore = timeDifference > 5000; // More than 5 seconds difference means it was updated before
  
  // Also check if any history exists (if history exists, it's definitely not first update)
  const hasHistory = resource.jobHistory.length > 0 || resource.salaryHistory.length > 0 || resource.positionHistory.length > 0;
  
  // It's first update if: never updated before AND no history exists
  // BUT: if resource was created with salary = 0 and this is setting it to > 0, consider it first update (initial setup)
  const isInitialSalarySetup = resource.salary === 0 && updateData.salary !== undefined && updateData.salary > 0;
  const isFirstUpdate = (!hasBeenUpdatedBefore && !hasHistory) || isInitialSalarySetup;

  // Check for work mode change
  if (updateData.workMode && updateData.workMode !== resource.workMode) {
    // Don't track if it's the first update (initial setup)
    if (!isFirstUpdate) {
      changes.workMode = true;
    }
  }

  // Check for job type change
  if (updateData.jobType && updateData.jobType !== resource.jobType) {
    // Don't track if it's the first update (initial setup)
    if (!isFirstUpdate) {
      changes.jobType = true;
    }
  }

  // Check for job status change
  if (updateData.jobStatus && updateData.jobStatus !== resource.jobStatus) {
    // Don't track if it's the first update (initial setup)
    if (!isFirstUpdate) {
      changes.jobStatus = true;
    }
  }

  // Check for salary change
  if (updateData.salary !== undefined && updateData.salary !== resource.salary) {
    // Track salary change if:
    // 1. It's not the first update (after initial setup)
    // 2. Old salary >= 0 and new salary > 0 (allow tracking from 0 to >0 if not first update)
    if (!isFirstUpdate && resource.salary >= 0 && updateData.salary > 0) {
      changes.salary = true;
    }
    // If it's first update, don't track (initial setup)
  }

  // Check for position change
  if (updateData.position && updateData.position !== resource.position) {
    // Don't track if it's the first update (initial setup)
    if (!isFirstUpdate) {
      changes.position = true;
    }
  }

  // Check for department change (considered as position change)
  if (updateData.department && updateData.department !== resource.department) {
    // Don't track if it's the first update (initial setup)
    if (!isFirstUpdate) {
      changes.department = true;
    }
  }

  // Update resource
  const updatedResource = await Resource.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedResource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found');
  }

  // Add to job history if changes detected (workMode, jobType, or jobStatus changed)
  // Only track if it's not the first update
  if ((changes.workMode || changes.jobType || changes.jobStatus) && !isFirstUpdate) {
    const jobHistoryEntry = {
      workMode: updatedResource.workMode,
      jobType: updatedResource.jobType,
      jobStatus: updatedResource.jobStatus,
      position: updatedResource.position,
      department: updatedResource.department,
      salary: updatedResource.salary,
      changedAt: new Date(),
      changedBy: userId ? { id: userId, name: userName || 'System', role: userRole || 'system' } : undefined,
      changeReason: (updateData as any).changeReason,
    };

    updatedResource.jobHistory.push(jobHistoryEntry);
  }

  // Add to salary history if salary changed
  // Track all salary changes after initial setup (when not first update)
  if (changes.salary) {
    const oldSalary = resource.salary;
    const newSalary = updatedResource.salary;
    // Calculate percentage change only if old salary > 0
    const percentageChange = oldSalary > 0 ? ((newSalary - oldSalary) / oldSalary) * 100 : undefined;

    const salaryHistoryEntry = {
      salary: newSalary,
      percentageChange: percentageChange !== undefined ? parseFloat(percentageChange.toFixed(2)) : undefined,
      changedAt: new Date(),
      changedBy: userId ? { id: userId, name: userName || 'System', role: userRole || 'system' } : undefined,
      changeReason: (updateData as any).changeReason,
    };

    updatedResource.salaryHistory.push(salaryHistoryEntry);
  }

  // Add to position history if position or department changed (only if not first update)
  if ((changes.position || changes.department) && !isFirstUpdate) {
    const positionHistoryEntry = {
      position: updatedResource.position,
      department: updatedResource.department,
      changedAt: new Date(),
      changedBy: userId ? { id: userId, name: userName || 'System', role: userRole || 'system' } : undefined,
      changeReason: (updateData as any).changeReason,
    };

    updatedResource.positionHistory.push(positionHistoryEntry);
  }

  await updatedResource.save();

  return updatedResource;
};

const deleteResource = async (id: string): Promise<{ resource: IResource | null; userDeleted: boolean }> => {
  // Find resource first to get userId
  const resource = await Resource.findById(id);
  
  if (!resource) {
    return { resource: null, userDeleted: false };
  }

  let userDeleted = false;

  // Delete associated user if exists
  if (resource.userId) {
    try {
      // Check if user exists before deleting
      const userExists = await User.findById(resource.userId);
      
      if (userExists) {
        await AuthService.deleteUser(resource.userId);
        userDeleted = true;
        console.log(`✅ User deleted: ${resource.userId} (associated with resource: ${resource.name})`);
      } else {
        console.log(`⚠️  User not found (already deleted): ${resource.userId} (associated with resource: ${resource.name})`);
      }
    } catch (error: any) {
      // Check if error is "User not found" - this is okay, user might already be deleted
      if (error?.statusCode === 404 || error?.message?.includes('not found')) {
        console.log(`⚠️  User not found (may already be deleted): ${resource.userId} (associated with resource: ${resource.name})`);
      } else {
        console.error('Error deleting user for resource:', error);
      }
      // Continue with resource deletion even if user deletion fails
      // User might not exist or might have been deleted already
    }
  }

  // Delete resource
  const deletedResource = await Resource.findByIdAndDelete(id);
  
  return { resource: deletedResource, userDeleted };
};

const addAttachment = async (
  id: string,
  attachment: { name: string; url: string; documentType?: string },
  userId?: string,
  userName?: string,
  userRole?: string
): Promise<IResource | null> => {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found');
  }

  resource.attachments.push({
    ...attachment,
    uploadedAt: new Date(),
    uploadedBy: userId ? { id: userId, name: userName || 'System', role: userRole || 'system' } : undefined,
  } as any);

  await resource.save();
  return resource;
};

const updateAttachment = async (
  id: string,
  attachmentIndex: number,
  updateData: { name?: string; documentType?: string }
): Promise<IResource | null> => {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found');
  }

  if (attachmentIndex < 0 || attachmentIndex >= resource.attachments.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid attachment index');
  }

  if (updateData.name) {
    resource.attachments[attachmentIndex].name = updateData.name;
  }
  if (updateData.documentType) {
    resource.attachments[attachmentIndex].documentType = updateData.documentType as any;
  }

  await resource.save();
  return resource;
};

const removeAttachment = async (id: string, attachmentIndex: number): Promise<IResource | null> => {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found');
  }

  if (attachmentIndex < 0 || attachmentIndex >= resource.attachments.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid attachment index');
  }

  resource.attachments.splice(attachmentIndex, 1);
  await resource.save();
  return resource;
};

export const ResourceService = {
  createResource,
  getAllResources,
  getSingleResource,
  getResourceByUserId,
  updateResource,
  deleteResource,
  addAttachment,
  updateAttachment,
  removeAttachment,
};

