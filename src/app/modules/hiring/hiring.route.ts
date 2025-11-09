import express from 'express';
import { ENUM_USER_ROLE } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { checkPermission } from '../../middlewares/permission';
import { ENUM_PERMISSION } from '../permission/permission.interface';
import { HiringController } from './hiring.controller';
import { uploadApplicationFiles } from '../../../shared/multerApplications';

const router = express.Router();

// Job Routes - Using Permission-Based Access
router.post(
  '/jobs',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_JOB_CREATE),
  HiringController.createJob
);

router.get(
  '/jobs',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_JOB_VIEW),
  HiringController.getAllJobs
);

router.get(
  '/jobs/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_JOB_VIEW),
  HiringController.getSingleJob
);

router.patch(
  '/jobs/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_JOB_EDIT),
  HiringController.updateJob
);

router.delete(
  '/jobs/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_JOB_DELETE),
  HiringController.deleteJob
);

// Application routes - Using Permission-Based Access
router.post(
  '/applications',
  uploadApplicationFiles,
  HiringController.createApplication
);
router.get(
  '/applications/job/:jobId',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_APPLICATION_VIEW),
  HiringController.getApplicationsByJob
);
router.get(
  '/applications/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_APPLICATION_VIEW),
  HiringController.getSingleApplication
);
router.patch(
  '/applications/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_APPLICATION_EDIT),
  HiringController.updateApplication
);
router.delete(
  '/applications/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_APPLICATION_DELETE),
  HiringController.deleteApplication
);
router.post(
  '/applications/:id/notes',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_APPLICATION_NOTES),
  HiringController.addApplicationNote
);
router.post(
  '/applications/:id/regenerate-score',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_APPLICATION_REGENERATE_SCORE),
  HiringController.regenerateATSScore
);

export const HiringRoutes = router;
