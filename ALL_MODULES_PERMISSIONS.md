# All Modules Permissions - Complete List

## Overview
All 5 modules with their permissions have been added to the permission management system.

## Modules and Permissions

### 1. HR Module (10 permissions)
- **Job Permissions:**
  - `HR_JOB_VIEW` - View Jobs
  - `HR_JOB_CREATE` - Create Jobs
  - `HR_JOB_EDIT` - Edit Jobs
  - `HR_JOB_DELETE` - Delete Jobs

- **Application Permissions:**
  - `HR_APPLICATION_VIEW` - View Applications
  - `HR_APPLICATION_CREATE` - Create Applications
  - `HR_APPLICATION_EDIT` - Edit Applications
  - `HR_APPLICATION_DELETE` - Delete Applications
  - `HR_APPLICATION_NOTES` - Manage Application Notes
  - `HR_APPLICATION_REGENERATE_SCORE` - Regenerate ATS Score

### 2. Leads Module (9 permissions)
- `LEADS_VIEW` - View Leads
- `LEADS_CREATE` - Create Leads
- `LEADS_EDIT` - Edit Leads
- `LEADS_DELETE` - Delete Leads
- `LEADS_ASSIGN` - Assign Leads
- `LEADS_MOVE` - Move Leads
- `LEADS_ACTIVITIES` - Manage Lead Activities
- `LEADS_NOTES` - Manage Lead Notes
- `LEADS_ATTACHMENTS` - Manage Lead Attachments

### 3. Deals Module (7 permissions)
- `DEALS_VIEW` - View Deals
- `DEALS_CREATE` - Create Deals
- `DEALS_EDIT` - Edit Deals
- `DEALS_DELETE` - Delete Deals
- `DEALS_CLOSE_REQUEST` - Request Deal Close
- `DEALS_APPROVE` - Approve Deal Close
- `DEALS_REJECT` - Reject Deal Close

### 4. Tasks Module (6 permissions)
- `TASKS_VIEW` - View Tasks
- `TASKS_CREATE` - Create Tasks
- `TASKS_EDIT` - Edit Tasks
- `TASKS_DELETE` - Delete Tasks
- `TASKS_ASSIGN` - Assign Tasks
- `TASKS_COMPLETE` - Complete Tasks

### 5. Dashboard Module (4 permissions)
- `DASHBOARD_VIEW` - View Dashboard
- `DASHBOARD_STATS` - View Dashboard Stats
- `DASHBOARD_REPORTS` - View Dashboard Reports
- `DASHBOARD_ANALYTICS` - View Dashboard Analytics

## Default Role Permissions

### HR Role
- All HR module permissions (10 permissions)

### ADMIN Role
- **All permissions** from all modules (36 permissions)

### REPRESENTATIVE Role
- All Leads module permissions (9 permissions)
- All Dashboard module permissions (4 permissions)
- Total: 13 permissions

### SUPER_ADMIN
- Automatically has all permissions (bypasses checks)

## Total Permissions
- **36 permissions** across **5 modules**

## How to Use

1. **Initialize Permissions:**
   ```bash
   cd backend
   npm run seed:permissions
   ```

2. **Access Permission Management:**
   - Navigate to `/dashboard/admin/permissions`
   - All 5 modules will be visible
   - Select any role and manage permissions

3. **Manage Permissions:**
   - Select a role (HR, Admin, Representative, Super Admin)
   - Filter by module or search permissions
   - Check/uncheck permissions
   - Save changes

## Frontend Integration

All permissions are available in the frontend:
- Import from `@/lib/hooks/usePermissions`
- Use `useHasPermission(ENUM_PERMISSION.LEADS_VIEW)` to check permissions
- All 36 permissions are available in the enum

## Next Steps

1. Run `npm run seed:permissions` to initialize all permissions
2. Access `/dashboard/admin/permissions` to see all modules
3. Assign permissions to roles as needed
4. Use permission checks in frontend components

