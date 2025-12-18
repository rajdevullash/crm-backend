import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { ShiftValidation } from './shift.validation';
import { ShiftController } from './shift.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';

const router = express.Router();

router.post(
  '/',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.HR),
  validateRequest(ShiftValidation.createShiftZodSchema),
  ShiftController.createShift
);

router.get(
  '/',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.HR, ENUM_USER_ROLE.REPRESENTATIVE),
  ShiftController.getAllShifts
);

router.patch(
  '/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.HR),
  ShiftController.updateShift
);

router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.HR),
  ShiftController.deleteShift
);

export const ShiftRoutes = router;
