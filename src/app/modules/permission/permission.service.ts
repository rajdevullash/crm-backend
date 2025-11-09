import { Types } from 'mongoose';
import { Permission, RolePermission, Module, Role, UserPermission } from './permission.model';
import { IPermission, IRolePermission, IModule, IPermissionFilters, IRole, IUserPermission } from './permission.interface';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { ENUM_MODULE, ENUM_PERMISSION } from './permission.interface';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';

// Pagination helper
const paginationHelper = {
  calculatePagination: (options: any) => {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    return {
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
    };
  },
};

// Get all permissions
const getAllPermissions = async (filters: IPermissionFilters, paginationOptions: any) => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(paginationOptions);

  const conditions: any = {};

  // Search term
  if (searchTerm) {
    conditions.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { displayName: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // Other filters
  Object.keys(filterData).forEach((key) => {
    if (filterData[key as keyof typeof filterData]) {
      conditions[key] = filterData[key as keyof typeof filterData];
    }
  });

  const sortConditions: any = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const result = await Permission.find(conditions)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Permission.countDocuments(conditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// Get permission by ID
const getPermissionById = async (id: string) => {
  const permission = await Permission.findById(id);
  return permission;
};

// Get all modules
const getAllModules = async () => {
  const modules = await Module.find().populate('permissions');
  return modules;
};

// Get module by name
const getModuleByName = async (moduleName: ENUM_MODULE) => {
  const module = await Module.findOne({ name: moduleName }).populate('permissions');
  return module;
};

// Get permissions for a role
const getRolePermissions = async (role: string) => {
  const rolePermission = await RolePermission.findOne({ role: role.toLowerCase() }).populate('permissions');
  return rolePermission;
};

// Get all role permissions
const getAllRolePermissions = async () => {
  const rolePermissions = await RolePermission.find().populate('permissions');
  return rolePermissions;
};

// Update role permissions
const updateRolePermissions = async (
  role: string,
  permissionIds: string[],
  createdBy?: string
) => {
  const rolePermission = await RolePermission.findOneAndUpdate(
    { role: role.toLowerCase() },
    {
      role: role.toLowerCase(),
      permissions: permissionIds.map((id) => new Types.ObjectId(id)),
      createdBy,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  ).populate('permissions');

  return rolePermission;
};

// Check if user has permission
const hasPermission = async (role: ENUM_USER_ROLE, permissionName: ENUM_PERMISSION): Promise<boolean> => {
  // Super admin has all permissions
  if (role === ENUM_USER_ROLE.SUPER_ADMIN) {
    return true;
  }

  // Get the permission
  const permission = await Permission.findOne({ name: permissionName });
  if (!permission) {
    return false;
  }

  // Get role permissions
  const rolePermission = await RolePermission.findOne({ role }).populate('permissions');
  if (!rolePermission) {
    return false;
  }

  // Check if permission is in role permissions
  const hasPerm = rolePermission.permissions.some(
    (perm: any) => perm._id.toString() === permission._id.toString()
  );

  return hasPerm;
};

// Check if user has any of the permissions
const hasAnyPermission = async (role: ENUM_USER_ROLE, permissionNames: ENUM_PERMISSION[]): Promise<boolean> => {
  // Super admin has all permissions
  if (role === ENUM_USER_ROLE.SUPER_ADMIN) {
    return true;
  }

  // Get role permissions
  const rolePermission = await RolePermission.findOne({ role }).populate('permissions');
  if (!rolePermission) {
    return false;
  }

  // Get all requested permissions
  const permissions = await Permission.find({ name: { $in: permissionNames } });
  if (permissions.length === 0) {
    return false;
  }

  // Check if any permission is in role permissions
  const permissionIds = permissions.map((p) => p._id.toString());
  const hasPerm = rolePermission.permissions.some((perm: any) =>
    permissionIds.includes(perm._id.toString())
  );

  return hasPerm;
};

// Initialize default permissions
const initializeDefaultPermissions = async () => {
  // First, initialize system roles
  const systemRoles = [
    { name: 'super_admin', displayName: 'Super Admin', description: 'Full system access', isSystem: true },
    { name: 'admin', displayName: 'Admin', description: 'Administrative access', isSystem: true },
    { name: 'hr', displayName: 'HR', description: 'Human Resources role', isSystem: true },
    { name: 'representative', displayName: 'Representative', description: 'Sales representative role', isSystem: true },
  ];

  for (const roleData of systemRoles) {
    await Role.findOneAndUpdate(
      { name: roleData.name },
      roleData,
      { upsert: true, new: true }
    );
  }

  console.log('✅ System roles initialized');

  const defaultPermissions = [
    // HR Module - Job Permissions
    {
      name: ENUM_PERMISSION.HR_JOB_VIEW,
      displayName: 'View Jobs',
      module: ENUM_MODULE.HR,
      action: 'view',
      resource: 'job',
      description: 'View job listings',
    },
    {
      name: ENUM_PERMISSION.HR_JOB_CREATE,
      displayName: 'Create Jobs',
      module: ENUM_MODULE.HR,
      action: 'create',
      resource: 'job',
      description: 'Create new job postings',
    },
    {
      name: ENUM_PERMISSION.HR_JOB_EDIT,
      displayName: 'Edit Jobs',
      module: ENUM_MODULE.HR,
      action: 'edit',
      resource: 'job',
      description: 'Edit existing job postings',
    },
    {
      name: ENUM_PERMISSION.HR_JOB_DELETE,
      displayName: 'Delete Jobs',
      module: ENUM_MODULE.HR,
      action: 'delete',
      resource: 'job',
      description: 'Delete job postings',
    },
    // HR Module - Application Permissions
    {
      name: ENUM_PERMISSION.HR_APPLICATION_VIEW,
      displayName: 'View Applications',
      module: ENUM_MODULE.HR,
      action: 'view',
      resource: 'application',
      description: 'View job applications',
    },
    {
      name: ENUM_PERMISSION.HR_APPLICATION_CREATE,
      displayName: 'Create Applications',
      module: ENUM_MODULE.HR,
      action: 'create',
      resource: 'application',
      description: 'Create new job applications',
    },
    {
      name: ENUM_PERMISSION.HR_APPLICATION_EDIT,
      displayName: 'Edit Applications',
      module: ENUM_MODULE.HR,
      action: 'edit',
      resource: 'application',
      description: 'Edit job applications',
    },
    {
      name: ENUM_PERMISSION.HR_APPLICATION_DELETE,
      displayName: 'Delete Applications',
      module: ENUM_MODULE.HR,
      action: 'delete',
      resource: 'application',
      description: 'Delete job applications',
    },
    {
      name: ENUM_PERMISSION.HR_APPLICATION_NOTES,
      displayName: 'Manage Application Notes',
      module: ENUM_MODULE.HR,
      action: 'notes',
      resource: 'application',
      description: 'Add and manage notes on applications',
    },
    {
      name: ENUM_PERMISSION.HR_APPLICATION_REGENERATE_SCORE,
      displayName: 'Regenerate ATS Score',
      module: ENUM_MODULE.HR,
      action: 'regenerate_score',
      resource: 'application',
      description: 'Regenerate ATS score for applications',
    },
    // Leads Module Permissions
    {
      name: ENUM_PERMISSION.LEADS_VIEW,
      displayName: 'View Leads',
      module: ENUM_MODULE.LEADS,
      action: 'view',
      resource: 'lead',
      description: 'View leads',
    },
    {
      name: ENUM_PERMISSION.LEADS_CREATE,
      displayName: 'Create Leads',
      module: ENUM_MODULE.LEADS,
      action: 'create',
      resource: 'lead',
      description: 'Create new leads',
    },
    {
      name: ENUM_PERMISSION.LEADS_EDIT,
      displayName: 'Edit Leads',
      module: ENUM_MODULE.LEADS,
      action: 'edit',
      resource: 'lead',
      description: 'Edit existing leads',
    },
    {
      name: ENUM_PERMISSION.LEADS_DELETE,
      displayName: 'Delete Leads',
      module: ENUM_MODULE.LEADS,
      action: 'delete',
      resource: 'lead',
      description: 'Delete leads',
    },
    {
      name: ENUM_PERMISSION.LEADS_ASSIGN,
      displayName: 'Assign Leads',
      module: ENUM_MODULE.LEADS,
      action: 'assign',
      resource: 'lead',
      description: 'Assign leads to representatives',
    },
    {
      name: ENUM_PERMISSION.LEADS_MOVE,
      displayName: 'Move Leads',
      module: ENUM_MODULE.LEADS,
      action: 'move',
      resource: 'lead',
      description: 'Move leads between stages',
    },
    {
      name: ENUM_PERMISSION.LEADS_ACTIVITIES,
      displayName: 'Manage Lead Activities',
      module: ENUM_MODULE.LEADS,
      action: 'activities',
      resource: 'lead',
      description: 'Add and manage lead activities',
    },
    {
      name: ENUM_PERMISSION.LEADS_NOTES,
      displayName: 'Manage Lead Notes',
      module: ENUM_MODULE.LEADS,
      action: 'notes',
      resource: 'lead',
      description: 'Add and manage lead notes',
    },
    {
      name: ENUM_PERMISSION.LEADS_ATTACHMENTS,
      displayName: 'Manage Lead Attachments',
      module: ENUM_MODULE.LEADS,
      action: 'attachments',
      resource: 'lead',
      description: 'Upload and manage lead attachments',
    },
    // Deals Module Permissions
    {
      name: ENUM_PERMISSION.DEALS_VIEW,
      displayName: 'View Deals',
      module: ENUM_MODULE.DEALS,
      action: 'view',
      resource: 'deal',
      description: 'View deals and deal close requests',
    },
    {
      name: ENUM_PERMISSION.DEALS_CREATE,
      displayName: 'Create Deals',
      module: ENUM_MODULE.DEALS,
      action: 'create',
      resource: 'deal',
      description: 'Create new deals',
    },
    {
      name: ENUM_PERMISSION.DEALS_EDIT,
      displayName: 'Edit Deals',
      module: ENUM_MODULE.DEALS,
      action: 'edit',
      resource: 'deal',
      description: 'Edit existing deals',
    },
    {
      name: ENUM_PERMISSION.DEALS_DELETE,
      displayName: 'Delete Deals',
      module: ENUM_MODULE.DEALS,
      action: 'delete',
      resource: 'deal',
      description: 'Delete deals',
    },
    {
      name: ENUM_PERMISSION.DEALS_CLOSE_REQUEST,
      displayName: 'Request Deal Close',
      module: ENUM_MODULE.DEALS,
      action: 'close_request',
      resource: 'deal',
      description: 'Request to close a deal',
    },
    {
      name: ENUM_PERMISSION.DEALS_APPROVE,
      displayName: 'Approve Deal Close',
      module: ENUM_MODULE.DEALS,
      action: 'approve',
      resource: 'deal',
      description: 'Approve deal close requests',
    },
    {
      name: ENUM_PERMISSION.DEALS_REJECT,
      displayName: 'Reject Deal Close',
      module: ENUM_MODULE.DEALS,
      action: 'reject',
      resource: 'deal',
      description: 'Reject deal close requests',
    },
    // Tasks Module Permissions
    {
      name: ENUM_PERMISSION.TASKS_VIEW,
      displayName: 'View Tasks',
      module: ENUM_MODULE.TASKS,
      action: 'view',
      resource: 'task',
      description: 'View tasks',
    },
    {
      name: ENUM_PERMISSION.TASKS_CREATE,
      displayName: 'Create Tasks',
      module: ENUM_MODULE.TASKS,
      action: 'create',
      resource: 'task',
      description: 'Create new tasks',
    },
    {
      name: ENUM_PERMISSION.TASKS_EDIT,
      displayName: 'Edit Tasks',
      module: ENUM_MODULE.TASKS,
      action: 'edit',
      resource: 'task',
      description: 'Edit existing tasks',
    },
    {
      name: ENUM_PERMISSION.TASKS_DELETE,
      displayName: 'Delete Tasks',
      module: ENUM_MODULE.TASKS,
      action: 'delete',
      resource: 'task',
      description: 'Delete tasks',
    },
    {
      name: ENUM_PERMISSION.TASKS_ASSIGN,
      displayName: 'Assign Tasks',
      module: ENUM_MODULE.TASKS,
      action: 'assign',
      resource: 'task',
      description: 'Assign tasks to users',
    },
    {
      name: ENUM_PERMISSION.TASKS_COMPLETE,
      displayName: 'Complete Tasks',
      module: ENUM_MODULE.TASKS,
      action: 'complete',
      resource: 'task',
      description: 'Mark tasks as complete',
    },
    // Dashboard Module Permissions
    {
      name: ENUM_PERMISSION.DASHBOARD_VIEW,
      displayName: 'View Dashboard',
      module: ENUM_MODULE.DASHBOARD,
      action: 'view',
      resource: 'dashboard',
      description: 'View dashboard',
    },
    {
      name: ENUM_PERMISSION.DASHBOARD_STATS,
      displayName: 'View Dashboard Stats',
      module: ENUM_MODULE.DASHBOARD,
      action: 'stats',
      resource: 'dashboard',
      description: 'View dashboard statistics',
    },
    {
      name: ENUM_PERMISSION.DASHBOARD_REPORTS,
      displayName: 'View Dashboard Reports',
      module: ENUM_MODULE.DASHBOARD,
      action: 'reports',
      resource: 'dashboard',
      description: 'View dashboard reports',
    },
    {
      name: ENUM_PERMISSION.DASHBOARD_ANALYTICS,
      displayName: 'View Dashboard Analytics',
      module: ENUM_MODULE.DASHBOARD,
      action: 'analytics',
      resource: 'dashboard',
      description: 'View dashboard analytics',
    },
    // Activities Module Permissions
    {
      name: ENUM_PERMISSION.ACTIVITIES_VIEW,
      displayName: 'View Activities',
      module: ENUM_MODULE.ACTIVITIES,
      action: 'view',
      resource: 'activity',
      description: 'View activities',
    },
    {
      name: ENUM_PERMISSION.ACTIVITIES_CREATE,
      displayName: 'Create Activities',
      module: ENUM_MODULE.ACTIVITIES,
      action: 'create',
      resource: 'activity',
      description: 'Create new activities',
    },
    {
      name: ENUM_PERMISSION.ACTIVITIES_EDIT,
      displayName: 'Edit Activities',
      module: ENUM_MODULE.ACTIVITIES,
      action: 'edit',
      resource: 'activity',
      description: 'Edit existing activities',
    },
    {
      name: ENUM_PERMISSION.ACTIVITIES_DELETE,
      displayName: 'Delete Activities',
      module: ENUM_MODULE.ACTIVITIES,
      action: 'delete',
      resource: 'activity',
      description: 'Delete activities',
    },
    {
      name: ENUM_PERMISSION.ACTIVITIES_ASSIGN,
      displayName: 'Assign Activities',
      module: ENUM_MODULE.ACTIVITIES,
      action: 'assign',
      resource: 'activity',
      description: 'Assign activities to users',
    },
    // Leaderboard Module Permissions
    {
      name: ENUM_PERMISSION.LEADERBOARD_VIEW,
      displayName: 'View Leaderboard',
      module: ENUM_MODULE.LEADERBOARD,
      action: 'view',
      resource: 'leaderboard',
      description: 'View leaderboard',
    },
    {
      name: ENUM_PERMISSION.LEADERBOARD_STATS,
      displayName: 'View Leaderboard Stats',
      module: ENUM_MODULE.LEADERBOARD,
      action: 'stats',
      resource: 'leaderboard',
      description: 'View leaderboard statistics',
    },
    {
      name: ENUM_PERMISSION.LEADERBOARD_EXPORT,
      displayName: 'Export Leaderboard',
      module: ENUM_MODULE.LEADERBOARD,
      action: 'export',
      resource: 'leaderboard',
      description: 'Export leaderboard data',
    },
    // Representatives Module Permissions
    {
      name: ENUM_PERMISSION.REPRESENTATIVES_VIEW,
      displayName: 'View Representatives',
      module: ENUM_MODULE.REPRESENTATIVES,
      action: 'view',
      resource: 'representative',
      description: 'View representatives',
    },
    {
      name: ENUM_PERMISSION.REPRESENTATIVES_CREATE,
      displayName: 'Create Representatives',
      module: ENUM_MODULE.REPRESENTATIVES,
      action: 'create',
      resource: 'representative',
      description: 'Create new representatives',
    },
    {
      name: ENUM_PERMISSION.REPRESENTATIVES_EDIT,
      displayName: 'Edit Representatives',
      module: ENUM_MODULE.REPRESENTATIVES,
      action: 'edit',
      resource: 'representative',
      description: 'Edit existing representatives',
    },
    {
      name: ENUM_PERMISSION.REPRESENTATIVES_DELETE,
      displayName: 'Delete Representatives',
      module: ENUM_MODULE.REPRESENTATIVES,
      action: 'delete',
      resource: 'representative',
      description: 'Delete representatives',
    },
    {
      name: ENUM_PERMISSION.REPRESENTATIVES_ASSIGN_LEADS,
      displayName: 'Assign Leads to Representatives',
      module: ENUM_MODULE.REPRESENTATIVES,
      action: 'assign_leads',
      resource: 'representative',
      description: 'Assign leads to representatives',
    },
    {
      name: ENUM_PERMISSION.REPRESENTATIVES_VIEW_PERFORMANCE,
      displayName: 'View Representative Performance',
      module: ENUM_MODULE.REPRESENTATIVES,
      action: 'view_performance',
      resource: 'representative',
      description: 'View performance metrics of representatives',
    },
  ];

  // Insert permissions if they don't exist
  for (const perm of defaultPermissions) {
    await Permission.findOneAndUpdate(
      { name: perm.name },
      perm,
      { upsert: true, new: true }
    );
  }

  // Create/Update all Modules
  const modules = [
    {
      name: ENUM_MODULE.HR,
      displayName: 'HR Module',
      description: 'Human Resources module for managing jobs and applications',
    },
    {
      name: ENUM_MODULE.LEADS,
      displayName: 'Leads Module',
      description: 'Manage leads, activities, notes, and attachments',
    },
    {
      name: ENUM_MODULE.DEALS,
      displayName: 'Deals Module',
      description: 'Manage deals and deal close requests',
    },
    {
      name: ENUM_MODULE.TASKS,
      displayName: 'Tasks Module',
      description: 'Manage tasks and assignments',
    },
    {
      name: ENUM_MODULE.DASHBOARD,
      displayName: 'Dashboard Module',
      description: 'View dashboard, statistics, reports, and analytics',
    },
    {
      name: ENUM_MODULE.ACTIVITIES,
      displayName: 'Activities Module',
      description: 'Manage activities and activity assignments',
    },
    {
      name: ENUM_MODULE.LEADERBOARD,
      displayName: 'Leaderboard Module',
      description: 'View leaderboard, statistics, and performance metrics',
    },
    {
      name: ENUM_MODULE.REPRESENTATIVES,
      displayName: 'Representatives Module',
      description: 'Manage representatives, assign leads, and view performance',
    },
  ];

  for (const moduleData of modules) {
    const modulePermissions = await Permission.find({ module: moduleData.name });
    await Module.findOneAndUpdate(
      { name: moduleData.name },
      {
        name: moduleData.name,
        displayName: moduleData.displayName,
        description: moduleData.description,
        permissions: modulePermissions.map((p) => p._id),
      },
      { upsert: true, new: true }
    );
  }

  // Initialize default role permissions for HR role (only HR permissions)
  const hrRolePermissions = await Permission.find({
    module: ENUM_MODULE.HR,
  });
  await RolePermission.findOneAndUpdate(
    { role: ENUM_USER_ROLE.HR },
    {
      role: ENUM_USER_ROLE.HR,
      permissions: hrRolePermissions.map((p) => p._id),
    },
    { upsert: true, new: true }
  );

  // Initialize default role permissions for ADMIN role (all permissions)
  const allPermissions = await Permission.find({});
  await RolePermission.findOneAndUpdate(
    { role: ENUM_USER_ROLE.ADMIN },
    {
      role: ENUM_USER_ROLE.ADMIN,
      permissions: allPermissions.map((p) => p._id),
    },
    { upsert: true, new: true }
  );

  // Initialize default role permissions for REPRESENTATIVE role (leads, dashboard, activities, and leaderboard permissions)
  const representativePermissions = await Permission.find({
    $or: [
      { module: ENUM_MODULE.LEADS },
      { module: ENUM_MODULE.DASHBOARD },
      { module: ENUM_MODULE.ACTIVITIES },
      { module: ENUM_MODULE.LEADERBOARD },
    ],
  });
  await RolePermission.findOneAndUpdate(
    { role: ENUM_USER_ROLE.REPRESENTATIVE },
    {
      role: ENUM_USER_ROLE.REPRESENTATIVE,
      permissions: representativePermissions.map((p) => p._id),
    },
    { upsert: true, new: true }
  );

  console.log('✅ Default permissions initialized for all modules');
};

// ============ Role Management ============

// Get all roles
const getAllRoles = async () => {
  const roles = await Role.find().sort({ isSystem: -1, createdAt: -1 });
  return roles;
};

// Get role by name
const getRoleByName = async (name: string) => {
  const role = await Role.findOne({ name: name.toLowerCase() });
  return role;
};

// Create new role
const createRole = async (roleData: { name: string; displayName: string; description?: string }, createdBy?: string) => {
  // Check if role already exists
  const existingRole = await Role.findOne({ name: roleData.name.toLowerCase() });
  if (existingRole) {
    throw new Error('Role already exists');
  }

  // Create role
  const role = await Role.create({
    name: roleData.name.toLowerCase(),
    displayName: roleData.displayName,
    description: roleData.description,
    isSystem: false,
    createdBy,
  });

  // Create empty role permission entry
  await RolePermission.create({
    role: role.name,
    permissions: [],
    createdBy,
  });

  return role;
};

// Update role
const updateRole = async (
  roleId: string,
  roleData: { displayName?: string; description?: string }
) => {
  const role = await Role.findById(roleId);
  
  if (!role) {
    throw new Error('Role not found');
  }

  if (role.isSystem) {
    throw new Error('Cannot update system role');
  }

  const updatedRole = await Role.findByIdAndUpdate(
    roleId,
    roleData,
    { new: true, runValidators: true }
  );

  return updatedRole;
};

// Delete role
const deleteRole = async (roleId: string) => {
  const role = await Role.findById(roleId);
  
  if (!role) {
    throw new Error('Role not found');
  }

  if (role.isSystem) {
    throw new Error('Cannot delete system role');
  }

  // Delete role permissions
  await RolePermission.deleteOne({ role: role.name });

  // Delete role
  await Role.findByIdAndDelete(roleId);

  return { message: 'Role deleted successfully' };
};

// ============ User-Specific Permissions ============

// Get user-specific permissions
const getUserPermissions = async (userId: string) => {
  const userPermission = await UserPermission.findOne({ userId }).populate('permissions');
  return userPermission;
};

// Get all user permissions
const getAllUserPermissions = async () => {
  const userPermissions = await UserPermission.find().populate('permissions');
  return userPermissions;
};

// Update user-specific permissions
const updateUserPermissions = async (
  userId: string,
  permissionIds: string[],
  createdBy?: string
) => {
  const userPermission = await UserPermission.findOneAndUpdate(
    { userId },
    {
      userId,
      permissions: permissionIds.map((id) => new Types.ObjectId(id)),
      createdBy,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  ).populate('permissions');

  return userPermission;
};

// Delete user-specific permissions
const deleteUserPermissions = async (userId: string) => {
  await UserPermission.deleteOne({ userId });
  return { message: 'User permissions deleted successfully' };
};

// Get merged permissions (role + user-specific)
const getMergedUserPermissions = async (userId: string, userRole: string) => {
  // Get role permissions
  const rolePermission = await RolePermission.findOne({ role: userRole.toLowerCase() }).populate('permissions');
  const rolePermissions = rolePermission?.permissions || [];

  // Get user-specific permissions
  const userPermission = await UserPermission.findOne({ userId }).populate('permissions');
  const userPermissions = userPermission?.permissions || [];

  // If user has specific permissions, use those; otherwise use role permissions
  if (userPermission && userPermissions.length > 0) {
    return {
      source: 'user-specific',
      permissions: userPermissions,
    };
  }

  return {
    source: 'role-based',
    permissions: rolePermissions,
  };
};

export const PermissionService = {
  getAllPermissions,
  getPermissionById,
  getAllModules,
  getModuleByName,
  getRolePermissions,
  getAllRolePermissions,
  updateRolePermissions,
  hasPermission,
  hasAnyPermission,
  initializeDefaultPermissions,
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

