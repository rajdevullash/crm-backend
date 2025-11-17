import express from 'express';
import { ApplicationStatusController } from './applicationStatus.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { checkPermission } from '../../middlewares/permission';
import { ENUM_PERMISSION } from '../permission/permission.interface';

const router = express.Router();

// Create application status (admin/super admin only)
router.post(
  '/',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_JOB_EDIT), // Using existing permission, can add new one later
  ApplicationStatusController.createApplicationStatus
);

// Get all application statuses (filter by department if provided)
router.get(
  '/',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR),
  ApplicationStatusController.getAllApplicationStatuses
);

// Get single application status
router.get(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR),
  ApplicationStatusController.getSingleApplicationStatus
);

// Update application status (admin/super admin only)
router.patch(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_JOB_EDIT),
  ApplicationStatusController.updateApplicationStatus
);

// Delete application status (admin/super admin only)
router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_JOB_DELETE),
  ApplicationStatusController.deleteApplicationStatus
);

export const ApplicationStatusRoutes = router;

