import express from 'express';
import validateRequest from '../../../app/middlewares/validateRequest';
import { AttendanceController } from './attendance.controller';
import { AttendanceValidation } from './attendance.validation';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';

const router = express.Router();

router.post(
  '/check-in',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.HR, ENUM_USER_ROLE.REPRESENTATIVE),
  validateRequest(AttendanceValidation.checkInZodSchema),
  AttendanceController.checkIn
);

router.post(
  '/check-out',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.HR, ENUM_USER_ROLE.REPRESENTATIVE),
  validateRequest(AttendanceValidation.checkOutZodSchema),
  AttendanceController.checkOut
);

router.get(
  '/stats',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.HR),
  AttendanceController.getDailyStats
);

router.get(
  '/',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.HR),
  AttendanceController.getAllAttendance
);

export const AttendanceRoutes = router;
