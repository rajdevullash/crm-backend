import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PermissionService } from './permission.service';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { ENUM_PERMISSION } from './permission.interface';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';

// Get all permissions
const getAllPermissions = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'module', 'action', 'resource']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await PermissionService.getAllPermissions(filters, paginationOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Permissions retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get permission by ID
const getPermissionById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const permission = await PermissionService.getPermissionById(id);

  if (!permission) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Permission not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Permission retrieved successfully',
    data: permission,
  });
});

// Get all modules
const getAllModules = catchAsync(async (req: Request, res: Response) => {
  const modules = await PermissionService.getAllModules();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Modules retrieved successfully',
    data: modules,
  });
});

// Get role permissions
const getRolePermissions = catchAsync(async (req: Request, res: Response) => {
  const { role } = req.params;
  
  if (!Object.values(ENUM_USER_ROLE).includes(role as ENUM_USER_ROLE)) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'Invalid role',
      data: null,
    });
  }

  const rolePermission = await PermissionService.getRolePermissions(role as ENUM_USER_ROLE);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Role permissions retrieved successfully',
    data: rolePermission,
  });
});

// Get all role permissions
const getAllRolePermissions = catchAsync(async (req: Request, res: Response) => {
  const rolePermissions = await PermissionService.getAllRolePermissions();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All role permissions retrieved successfully',
    data: rolePermissions,
  });
});

// Update role permissions
const updateRolePermissions = catchAsync(async (req: Request, res: Response) => {
  const { role } = req.params;
  const { permissionIds } = req.body;
  const user = (req as any).user;

  if (!Object.values(ENUM_USER_ROLE).includes(role as ENUM_USER_ROLE)) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'Invalid role',
      data: null,
    });
  }

  if (!Array.isArray(permissionIds)) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'permissionIds must be an array',
      data: null,
    });
  }

  const rolePermission = await PermissionService.updateRolePermissions(
    role as ENUM_USER_ROLE,
    permissionIds,
    user?.userId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Role permissions updated successfully',
    data: rolePermission,
  });
});

// Initialize default permissions
const initializePermissions = catchAsync(async (req: Request, res: Response) => {
  await PermissionService.initializeDefaultPermissions();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Default permissions initialized successfully',
    data: null,
  });
});

// ============ Role Management ============

// Get all roles
const getAllRoles = catchAsync(async (req: Request, res: Response) => {
  const roles = await PermissionService.getAllRoles();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Roles retrieved successfully',
    data: roles,
  });
});

// Get role by name
const getRoleByName = catchAsync(async (req: Request, res: Response) => {
  const { name } = req.params;
  const role = await PermissionService.getRoleByName(name);

  if (!role) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Role not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Role retrieved successfully',
    data: role,
  });
});

// Create new role
const createRole = catchAsync(async (req: Request, res: Response) => {
  const { name, displayName, description } = req.body;
  const user = (req as any).user;

  if (!name || !displayName) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'Name and displayName are required',
      data: null,
    });
  }

  const role = await PermissionService.createRole(
    { name, displayName, description },
    user?.userId
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Role created successfully',
    data: role,
  });
});

// Update role
const updateRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { displayName, description } = req.body;

  const role = await PermissionService.updateRole(id, { displayName, description });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Role updated successfully',
    data: role,
  });
});

// Delete role
const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await PermissionService.deleteRole(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

// ============ User-Specific Permissions ============

// Get user permissions
const getUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const userPermission = await PermissionService.getUserPermissions(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User permissions retrieved successfully',
    data: userPermission,
  });
});

// Get all user permissions
const getAllUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const userPermissions = await PermissionService.getAllUserPermissions();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All user permissions retrieved successfully',
    data: userPermissions,
  });
});

// Update user permissions
const updateUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { permissionIds } = req.body;
  const user = (req as any).user;

  if (!Array.isArray(permissionIds)) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'permissionIds must be an array',
      data: null,
    });
  }

  const userPermission = await PermissionService.updateUserPermissions(
    userId,
    permissionIds,
    user?.userId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User permissions updated successfully',
    data: userPermission,
  });
});

// Delete user permissions
const deleteUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await PermissionService.deleteUserPermissions(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

// Get merged user permissions (role + user-specific)
const getMergedUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const { userId, userRole } = req.params;

  const result = await PermissionService.getMergedUserPermissions(userId, userRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Merged user permissions retrieved successfully',
    data: result,
  });
});

export const PermissionController = {
  getAllPermissions,
  getPermissionById,
  getAllModules,
  getRolePermissions,
  getAllRolePermissions,
  updateRolePermissions,
  initializePermissions,
  // Role Management
  getAllRoles,
  getRoleByName,
  createRole,
  updateRole,
  deleteRole,
  // User-Specific Permissions
  getUserPermissions,
  getAllUserPermissions,
  updateUserPermissions,
  deleteUserPermissions,
  getMergedUserPermissions,
};

