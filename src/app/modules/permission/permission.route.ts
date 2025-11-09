import express from 'express';
import { ENUM_USER_ROLE } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { PermissionController } from './permission.controller';

const router = express.Router();

// Initialize default permissions (Admin only)
router.post(
  '/initialize',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.initializePermissions
);

// Get all permissions (Admin only)
router.get(
  '/permissions',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.getAllPermissions
);

// Get permission by ID (Admin only)
router.get(
  '/permissions/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.getPermissionById
);

// Get all modules (Admin only)
router.get(
  '/modules',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.getAllModules
);

// Get role permissions (Admin only)
router.get(
  '/roles/:role',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.getRolePermissions
);

// Get all role permissions (All authenticated users can access for UI rendering)
router.get(
  '/roles',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR, ENUM_USER_ROLE.REPRESENTATIVE),
  PermissionController.getAllRolePermissions
);

// Update role permissions (Admin only)
router.patch(
  '/roles/:role',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.updateRolePermissions
);

// ============ Role Management Routes ============

// Get all roles (Admin only)
router.get(
  '/roles-management',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.getAllRoles
);

// Get role by name (Admin only)
router.get(
  '/roles-management/:name',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.getRoleByName
);

// Create new role (Admin only)
router.post(
  '/roles-management',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.createRole
);

// Update role (Admin only)
router.patch(
  '/roles-management/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.updateRole
);

// Delete role (Admin only)
router.delete(
  '/roles-management/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.deleteRole
);

// ============ User-Specific Permission Routes ============

// Get user permissions by userId (Admin only)
router.get(
  '/user-permissions/:userId',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.getUserPermissions
);

// Get all user permissions (Admin only)
router.get(
  '/user-permissions',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.getAllUserPermissions
);

// Update user permissions (Admin only)
router.patch(
  '/user-permissions/:userId',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.updateUserPermissions
);

// Delete user permissions (Admin only)
router.delete(
  '/user-permissions/:userId',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PermissionController.deleteUserPermissions
);

// Get merged user permissions (role + user-specific) - All authenticated users can fetch their own
router.get(
  '/user-permissions/:userId/:userRole/merged',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR, ENUM_USER_ROLE.REPRESENTATIVE),
  PermissionController.getMergedUserPermissions
);

export const PermissionRoutes = router;

