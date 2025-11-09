import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { PermissionService } from '../modules/permission/permission.service';
import { ENUM_PERMISSION } from '../modules/permission/permission.interface';
import { ENUM_USER_ROLE } from '../../enums/user';

type AuthenticatedRequest = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
} & Request;

/**
 * Middleware to check if user has required permission
 * Checks user-specific permissions first, then falls back to role-based permissions
 * @param permissionName - The permission to check
 */
const checkPermission =
  (permissionName: ENUM_PERMISSION) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }

      // Super admin bypasses all permission checks
      if (user.role === ENUM_USER_ROLE.SUPER_ADMIN) {
        return next();
      }

      // Check user-specific permissions first
      const userPermission = await PermissionService.getUserPermissions(user.userId);
      
      if (userPermission && userPermission.permissions.length > 0) {
        // User has specific permissions, check against those
        const hasUserPerm = userPermission.permissions.some(
          (perm: any) => perm.name === permissionName
        );
        
        if (!hasUserPerm) {
          throw new ApiError(
            httpStatus.FORBIDDEN,
            'You do not have permission to perform this action'
          );
        }
        
        return next();
      }

      // Fall back to role-based permissions
      const hasPerm = await PermissionService.hasPermission(user.role, permissionName);

      if (!hasPerm) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          'You do not have permission to perform this action'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

/**
 * Middleware to check if user has any of the required permissions
 * Checks user-specific permissions first, then falls back to role-based permissions
 * @param permissionNames - Array of permissions to check (user needs at least one)
 */
const checkAnyPermission =
  (...permissionNames: ENUM_PERMISSION[]) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }

      // Super admin bypasses all permission checks
      if (user.role === ENUM_USER_ROLE.SUPER_ADMIN) {
        return next();
      }

      // Check user-specific permissions first
      const userPermission = await PermissionService.getUserPermissions(user.userId);
      
      if (userPermission && userPermission.permissions.length > 0) {
        // User has specific permissions, check against those
        const hasUserPerm = userPermission.permissions.some(
          (perm: any) => permissionNames.includes(perm.name as ENUM_PERMISSION)
        );
        
        if (!hasUserPerm) {
          throw new ApiError(
            httpStatus.FORBIDDEN,
            'You do not have permission to perform this action'
          );
        }
        
        return next();
      }

      // Fall back to role-based permissions
      const hasPerm = await PermissionService.hasAnyPermission(user.role, permissionNames);

      if (!hasPerm) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          'You do not have permission to perform this action'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export { checkPermission, checkAnyPermission };

