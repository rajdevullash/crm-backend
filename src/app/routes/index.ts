import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.route';
import { TaskRoutes } from '../modules/task/task.route';
import { LeadRoutes } from '../modules/lead/lead.route';
import { StageRoutes } from '../modules/stage/stage.route';
import { DashboardRoutes } from '../modules/dashboard/dashboard.route';
import { NotificationRoutes } from '../modules/notification/notification.route';
import { DealCloseRequestRoutes } from '../modules/dealCloseRequest/dealCloseRequest.route';
import { HiringRoutes } from '../modules/hiring/hiring.route';
import { PermissionRoutes } from '../modules/permission/permission.route';
import { ResourceRoutes } from '../modules/resource/resource.route';
import ActivityBadgeRoutes from '../modules/activityBadge/activityBadge.route';
import formTemplateRoutes from '../modules/hiring/formTemplate.route';
import applicationResponseRoutes from '../modules/hiring/applicationResponse.route';
import { DepartmentRoutes } from '../modules/department/department.route';
import { ApplicationStatusRoutes } from '../modules/hiring/applicationStatus.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/tasks',
    route: TaskRoutes,
  },
  {
    path: '/leads',
    route: LeadRoutes,
  },
  {
    path: '/stages',
    route: StageRoutes,
  },
  {
    path: '/dashboard',
    route: DashboardRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
  {
    path: '/deal-close-requests',
    route: DealCloseRequestRoutes,
  },
  {
    path: '/hiring',
    route: HiringRoutes,
  },
  {
    path: '/permissions',
    route: PermissionRoutes,
  },
  {
    path: '/resources',
    route: ResourceRoutes,
  },
  {
    path: '/activity-badge',
    route: ActivityBadgeRoutes,
  },
  {
    path: '/form-templates',
    route: formTemplateRoutes,
  },
  {
    path: '/application-responses',
    route: applicationResponseRoutes,
  },
  {
    path: '/departments',
    route: DepartmentRoutes,
  },
  {
    path: '/application-statuses',
    route: ApplicationStatusRoutes,
  }
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
