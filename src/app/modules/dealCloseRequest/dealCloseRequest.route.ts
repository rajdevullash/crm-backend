import express from 'express';
import { DealCloseRequestController } from './dealCloseRequest.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';

const router = express.Router();

// Representative routes
router.post(
  '/create',
  auth(ENUM_USER_ROLE.REPRESENTATIVE),
  DealCloseRequestController.createCloseRequest
);

router.post(
  '/mark-lost',
  auth(ENUM_USER_ROLE.REPRESENTATIVE, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  DealCloseRequestController.markAsLost
);

router.delete(
  '/delete/:leadId',
  auth(ENUM_USER_ROLE.REPRESENTATIVE, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  DealCloseRequestController.deleteCloseRequest
);

router.get(
  '/my-approved',
  auth(ENUM_USER_ROLE.REPRESENTATIVE),
  DealCloseRequestController.getMyApprovedRequests
);

// Admin routes
router.get(
  '/',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  DealCloseRequestController.getAllCloseRequests
);

router.patch(
  '/approve/:requestId',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  DealCloseRequestController.approveCloseRequest
);

router.patch(
  '/reject/:requestId',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  DealCloseRequestController.rejectCloseRequest
);

export const DealCloseRequestRoutes = router;
