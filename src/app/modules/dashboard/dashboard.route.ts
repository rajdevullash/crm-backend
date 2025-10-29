import express from 'express';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { DashboardController } from './dashboard.controller';

const router = express.Router();

// Get leaderboard - accessible by admin, super_admin, and representative
router.get(
  '/leaderboard',
  auth(
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.REPRESENTATIVE
  ),
  DashboardController.getLeaderboard
);

// Get revenue overview - accessible by admin and super_admin
// Query params: ?year=2025&month=10 (month is optional)
router.get(
  '/revenue-overview',
  auth(
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.REPRESENTATIVE
  ),
  DashboardController.getRevenueOverview
);

// Get representative dashboard statistics - accessible by representatives only
router.get(
  '/representative-stats',
  auth(ENUM_USER_ROLE.REPRESENTATIVE),
  DashboardController.getRepresentativeStats
);

export const DashboardRoutes = router;
