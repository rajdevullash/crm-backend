# Permission Management System

## Overview
This module provides a comprehensive role-based permission management system that allows administrators to control access to different modules and actions within the CRM system.

## Features
- **Module-based Permissions**: Permissions are organized by modules (HR, Leads, Deals, etc.)
- **Granular Access Control**: Fine-grained permissions for view, create, edit, delete, and custom actions
- **Role Management**: Assign permissions to user roles (HR, Admin, etc.)
- **Admin Control**: Administrators can manage permissions through API endpoints

## Permission Structure

### HR Module Permissions
- `HR_JOB_VIEW` - View job listings
- `HR_JOB_CREATE` - Create new jobs
- `HR_JOB_EDIT` - Edit existing jobs
- `HR_JOB_DELETE` - Delete jobs
- `HR_APPLICATION_VIEW` - View applications
- `HR_APPLICATION_CREATE` - Create applications (public)
- `HR_APPLICATION_EDIT` - Edit applications
- `HR_APPLICATION_DELETE` - Delete applications
- `HR_APPLICATION_NOTES` - Add/manage application notes
- `HR_APPLICATION_REGENERATE_SCORE` - Regenerate ATS scores

## Database Models

### Permission
Stores individual permissions with metadata.

### Module
Organizes permissions by module (HR, Leads, etc.).

### RolePermission
Maps roles to their assigned permissions.

## API Endpoints

### Initialize Permissions (Admin Only)
```
POST /api/v1/permissions/initialize
```
Initializes default permissions in the database.

### Get All Permissions (Admin Only)
```
GET /api/v1/permissions/permissions?page=1&limit=10&module=hr
```

### Get Permission by ID (Admin Only)
```
GET /api/v1/permissions/permissions/:id
```

### Get All Modules (Admin Only)
```
GET /api/v1/permissions/modules
```

### Get Role Permissions (Admin Only)
```
GET /api/v1/permissions/roles/:role
```

### Get All Role Permissions (Admin Only)
```
GET /api/v1/permissions/roles
```

### Update Role Permissions (Admin Only)
```
PATCH /api/v1/permissions/roles/:role
Body: {
  "permissionIds": ["permission_id_1", "permission_id_2", ...]
}
```

## Usage in Routes

### Using Permission Middleware
```typescript
import { checkPermission } from '../../middlewares/permission';
import { ENUM_PERMISSION } from '../permission/permission.interface';

router.get(
  '/jobs',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN),
  checkPermission(ENUM_PERMISSION.HR_JOB_VIEW),
  Controller.getAllJobs
);
```

### Checking Permissions in Service
```typescript
import { PermissionService } from '../permission/permission.service';
import { ENUM_PERMISSION } from './permission.interface';

const hasPerm = await PermissionService.hasPermission(userRole, ENUM_PERMISSION.HR_JOB_CREATE);
```

## Seeding Default Permissions

Run the seed script to initialize default permissions:
```bash
npm run seed:permissions
```

This will:
1. Create all default permissions
2. Create module entries
3. Assign default permissions to HR and ADMIN roles

## Super Admin
Super Admin users automatically have all permissions and bypass permission checks.

## Default Role Permissions

### HR Role
- All HR module permissions (jobs and applications)

### ADMIN Role
- All HR module permissions (can manage HR permissions)

### SUPER_ADMIN
- All permissions (bypasses permission checks)

## Adding New Permissions

1. Add permission enum to `permission.interface.ts`
2. Add permission initialization in `permission.service.ts` `initializeDefaultPermissions`
3. Use the permission in routes with `checkPermission` middleware

## Example: Adding Lead Permissions

```typescript
// In permission.interface.ts
export enum ENUM_PERMISSION {
  // ... existing permissions
  LEADS_VIEW = 'leads_view',
  LEADS_CREATE = 'leads_create',
  LEADS_EDIT = 'leads_edit',
  LEADS_DELETE = 'leads_delete',
}

// In permission.service.ts initializeDefaultPermissions
{
  name: ENUM_PERMISSION.LEADS_VIEW,
  displayName: 'View Leads',
  module: ENUM_MODULE.LEADS,
  action: 'view',
  resource: 'lead',
  description: 'View lead listings',
},
```

