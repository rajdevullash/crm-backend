import { ENUM_USER_ROLE } from '../../../enums/user';

export enum ENUM_PERMISSION {
  // HR Module - Job Permissions
  HR_JOB_VIEW = 'hr_job_view',
  HR_JOB_CREATE = 'hr_job_create',
  HR_JOB_EDIT = 'hr_job_edit',
  HR_JOB_DELETE = 'hr_job_delete',
  
  // HR Module - Application Permissions
  HR_APPLICATION_VIEW = 'hr_application_view',
  HR_APPLICATION_CREATE = 'hr_application_create',
  HR_APPLICATION_EDIT = 'hr_application_edit',
  HR_APPLICATION_DELETE = 'hr_application_delete',
  HR_APPLICATION_NOTES = 'hr_application_notes',
  HR_APPLICATION_REGENERATE_SCORE = 'hr_application_regenerate_score',
  
  // HR Module - Resource Permissions
  HR_RESOURCE_VIEW = 'hr_resource_view',
  HR_RESOURCE_CREATE = 'hr_resource_create',
  HR_RESOURCE_EDIT = 'hr_resource_edit',
  HR_RESOURCE_DELETE = 'hr_resource_delete',
  
  // Leads Module Permissions
  LEADS_VIEW = 'leads_view',
  LEADS_CREATE = 'leads_create',
  LEADS_EDIT = 'leads_edit',
  LEADS_DELETE = 'leads_delete',
  LEADS_ASSIGN = 'leads_assign',
  LEADS_MOVE = 'leads_move',
  LEADS_ACTIVITIES = 'leads_activities',
  LEADS_NOTES = 'leads_notes',
  LEADS_ATTACHMENTS = 'leads_attachments',
  
  // Deals Module Permissions
  DEALS_VIEW = 'deals_view',
  DEALS_CREATE = 'deals_create',
  DEALS_EDIT = 'deals_edit',
  DEALS_DELETE = 'deals_delete',
  DEALS_CLOSE_REQUEST = 'deals_close_request',
  DEALS_APPROVE = 'deals_approve',
  DEALS_REJECT = 'deals_reject',
  
  // Tasks Module Permissions
  TASKS_VIEW = 'tasks_view',
  TASKS_CREATE = 'tasks_create',
  TASKS_EDIT = 'tasks_edit',
  TASKS_DELETE = 'tasks_delete',
  TASKS_ASSIGN = 'tasks_assign',
  TASKS_COMPLETE = 'tasks_complete',
  
  // Dashboard Module Permissions
  DASHBOARD_VIEW = 'dashboard_view',
  DASHBOARD_STATS = 'dashboard_stats',
  DASHBOARD_REPORTS = 'dashboard_reports',
  DASHBOARD_ANALYTICS = 'dashboard_analytics',
  
  // Activities Module Permissions
  ACTIVITIES_VIEW = 'activities_view',
  ACTIVITIES_CREATE = 'activities_create',
  ACTIVITIES_EDIT = 'activities_edit',
  ACTIVITIES_DELETE = 'activities_delete',
  ACTIVITIES_ASSIGN = 'activities_assign',
  
  // Leaderboard Module Permissions
  LEADERBOARD_VIEW = 'leaderboard_view',
  LEADERBOARD_STATS = 'leaderboard_stats',
  LEADERBOARD_EXPORT = 'leaderboard_export',
  
  // Representatives Module Permissions (User Management)
  REPRESENTATIVES_VIEW = 'representatives_view',
  REPRESENTATIVES_CREATE = 'representatives_create',
  REPRESENTATIVES_EDIT = 'representatives_edit',
  REPRESENTATIVES_DELETE = 'representatives_delete',
  REPRESENTATIVES_ASSIGN_LEADS = 'representatives_assign_leads',
  REPRESENTATIVES_VIEW_PERFORMANCE = 'representatives_view_performance',
}

export enum ENUM_MODULE {
  HR = 'hr',
  LEADS = 'leads',
  DEALS = 'deals',
  TASKS = 'tasks',
  DASHBOARD = 'dashboard',
  ACTIVITIES = 'activities',
  LEADERBOARD = 'leaderboard',
  REPRESENTATIVES = 'representatives',
}

export interface IPermission {
  _id?: string;
  name: string; // e.g., 'hr_job_view'
  displayName: string; // e.g., 'View Jobs'
  module: ENUM_MODULE;
  action: string; // e.g., 'view', 'create', 'edit', 'delete'
  resource: string; // e.g., 'job', 'application'
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IModule {
  _id?: string;
  name: ENUM_MODULE;
  displayName: string; // e.g., 'HR Module'
  description?: string;
  permissions: string[]; // Array of permission IDs
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRole {
  _id?: string;
  name: string; // Unique role name (e.g., 'sales_manager', 'team_lead')
  displayName: string; // Display name (e.g., 'Sales Manager', 'Team Lead')
  description?: string;
  isSystem: boolean; // True for predefined roles (admin, hr, representative)
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRolePermission {
  _id?: string;
  role: string; // Changed from ENUM_USER_ROLE to string to support custom roles
  permissions: string[]; // Array of permission IDs
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserPermission {
  _id?: string;
  userId: string; // User ID
  permissions: string[]; // Array of permission IDs (overrides role permissions)
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPermissionFilters {
  searchTerm?: string;
  module?: ENUM_MODULE;
  action?: string;
  resource?: string;
}

