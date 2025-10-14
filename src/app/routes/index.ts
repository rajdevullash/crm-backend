import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.route';
import { TaskRoutes } from '../modules/task/task.route';
import { LeadRoutes } from '../modules/lead/lead.route';
import { StageRoutes } from '../modules/stage/stage.route';
import { DashboardRoutes } from '../modules/dashboard/dashboard.route';

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
  }
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
