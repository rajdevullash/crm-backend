import express from 'express';
import { ENUM_USER_ROLE } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { checkPermission } from '../../middlewares/permission';
import { ENUM_PERMISSION } from '../permission/permission.interface';
import { PayslipController } from './payslip.controller';

const router = express.Router();

// Payslip Routes
router.post(
  '/',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_VIEW),
  PayslipController.generatePayslip
);

router.get(
  '/',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_VIEW),
  PayslipController.getAllPayslips
);

router.get(
  '/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_VIEW),
  PayslipController.getSinglePayslip
);

router.get(
  '/resource/:resourceId',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_VIEW),
  PayslipController.getPayslipsByResource
);

router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_EDIT),
  PayslipController.deletePayslip
);

export const PayslipRoutes = router;

