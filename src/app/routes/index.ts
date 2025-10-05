import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.route';
import { TaskRoutes } from '../modules/task/task.route';
import { LeadRoutes } from '../modules/lead/lead.route';

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
  }
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
