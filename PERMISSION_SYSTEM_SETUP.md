# Permission Management System - Setup Guide

## Overview
A comprehensive role and module-based permission management system has been implemented for the CRM. Administrators can now manage granular permissions for different roles and modules.

## What Was Created

### 1. Permission Models (`backend/src/app/modules/permission/`)
- **Permission Model**: Stores individual permissions
- **Module Model**: Organizes permissions by module (HR, Leads, etc.)
- **RolePermission Model**: Maps roles to their assigned permissions

### 2. Permission Service (`permission.service.ts`)
- `getAllPermissions()` - Get all permissions with filtering
- `getRolePermissions()` - Get permissions for a specific role
- `updateRolePermissions()` - Update permissions for a role
- `hasPermission()` - Check if a role has a specific permission
- `initializeDefaultPermissions()` - Initialize default permissions

### 3. Permission Controller (`permission.controller.ts`)
- Admin endpoints for managing permissions
- View permissions, modules, and role permissions
- Update role permissions

### 4. Permission Middleware (`backend/src/app/middlewares/permission.ts`)
- `checkPermission()` - Check single permission
- `checkAnyPermission()` - Check multiple permissions (OR logic)

### 5. Permission Routes (`permission.route.ts`)
- Admin-only endpoints for permission management
- `/api/v1/permissions/*`

## HR Module Permissions

### Job Permissions
- `HR_JOB_VIEW` - View job listings
- `HR_JOB_CREATE` - Create new jobs
- `HR_JOB_EDIT` - Edit existing jobs
- `HR_JOB_DELETE` - Delete jobs

### Application Permissions
- `HR_APPLICATION_VIEW` - View applications
- `HR_APPLICATION_CREATE` - Create applications (public endpoint)
- `HR_APPLICATION_EDIT` - Edit applications
- `HR_APPLICATION_DELETE` - Delete applications
- `HR_APPLICATION_NOTES` - Add/manage application notes
- `HR_APPLICATION_REGENERATE_SCORE` - Regenerate ATS scores

## Setup Instructions

### Step 1: Initialize Permissions
Run the seed script to initialize default permissions:
```bash
cd backend
npm run seed:permissions
```

This will:
- Create all default HR permissions
- Create HR module entry
- Assign all HR permissions to HR role
- Assign all HR permissions to ADMIN role

### Step 2: Verify Setup
Check if permissions were created:
```bash
# Get all permissions
GET /api/v1/permissions/permissions

# Get HR role permissions
GET /api/v1/permissions/roles/hr
```

### Step 3: Manage Permissions (Admin Only)
Update role permissions:
```bash
PATCH /api/v1/permissions/roles/hr
Body: {
  "permissionIds": ["permission_id_1", "permission_id_2", ...]
}
```

## How It Works

### 1. Route Protection
Routes now use both role-based and permission-based access:
```typescript
router.get(
  '/jobs',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN), // Role check
  checkPermission(ENUM_PERMISSION.HR_JOB_VIEW),  // Permission check
  Controller.getAllJobs
);
```

### 2. Permission Check Flow
1. User authenticates (JWT token)
2. Auth middleware verifies token and role
3. Permission middleware checks if role has required permission
4. Request proceeds if permission exists

### 3. Super Admin Bypass
Super Admin users automatically have all permissions and bypass permission checks.

## API Endpoints

### Permission Management (Admin Only)
- `POST /api/v1/permissions/initialize` - Initialize default permissions
- `GET /api/v1/permissions/permissions` - Get all permissions
- `GET /api/v1/permissions/permissions/:id` - Get permission by ID
- `GET /api/v1/permissions/modules` - Get all modules
- `GET /api/v1/permissions/roles` - Get all role permissions
- `GET /api/v1/permissions/roles/:role` - Get role permissions
- `PATCH /api/v1/permissions/roles/:role` - Update role permissions

## Updated Hiring Routes

All hiring routes now use permission-based access:
- Job routes: `HR_JOB_VIEW`, `HR_JOB_CREATE`, `HR_JOB_EDIT`, `HR_JOB_DELETE`
- Application routes: `HR_APPLICATION_VIEW`, `HR_APPLICATION_EDIT`, `HR_APPLICATION_DELETE`, etc.

## Adding New Permissions

1. Add permission enum to `permission.interface.ts`
2. Add permission initialization in `permission.service.ts`
3. Use permission in routes with `checkPermission` middleware

## Example: Frontend Integration

The frontend can now:
1. Fetch role permissions: `GET /api/v1/permissions/roles/hr`
2. Show/hide UI elements based on permissions
3. Display permission management UI for admins

## Testing

1. **Initialize permissions**: `npm run seed:permissions`
2. **Test HR user**: Should have all HR permissions
3. **Test Admin user**: Should have all HR permissions
4. **Update permissions**: Remove some permissions from HR role and test
5. **Test access**: Verify routes reject requests without permissions

## Notes

- Super Admin always has all permissions
- Permission checks happen after role checks
- Permissions are cached in RolePermission model
- Default permissions are assigned on initialization

