import express from 'express';
import { ENUM_USER_ROLE } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { HiringController } from './hiring.controller';
import { uploadApplicationFiles } from '../../../shared/multerApplications';

const router = express.Router();

// Job Routes
router.post(
  '/jobs',
  auth(ENUM_USER_ROLE.HR),
  HiringController.createJob
);

router.get(
  '/jobs',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  HiringController.getAllJobs
);

router.get(
  '/jobs/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  HiringController.getSingleJob
);

router.patch(
  '/jobs/:id',
  auth(ENUM_USER_ROLE.HR),
  HiringController.updateJob
);

router.delete(
  '/jobs/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  HiringController.deleteJob
);

// Application routes
router.post(
  '/applications',
  uploadApplicationFiles,
  HiringController.createApplication
);
router.get('/applications/job/:jobId', auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN), HiringController.getApplicationsByJob);
router.get('/applications/:id', auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN), HiringController.getSingleApplication);
router.patch('/applications/:id', auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN), HiringController.updateApplication);
router.delete('/applications/:id', auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN), HiringController.deleteApplication);
router.post('/applications/:id/notes', auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN), HiringController.addApplicationNote);
router.post('/applications/:id/regenerate-score', auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN), HiringController.regenerateATSScore);

export const HiringRoutes = router;
