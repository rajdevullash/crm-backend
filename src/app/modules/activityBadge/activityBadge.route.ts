import { Router } from 'express';
import { ENUM_USER_ROLE } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { ActivityBadgeController } from './activityBadge.controller';

const router = Router();

// Get activity badge status
router.get(
  '/status',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  ActivityBadgeController.getBadgeStatus
);

// Mark activity badge as viewed
router.post(
  '/mark-viewed',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  ActivityBadgeController.markAsViewed
);

export default router;

