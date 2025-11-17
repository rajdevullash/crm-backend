import express from 'express';
import { DepartmentController } from './department.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';

const router = express.Router();

// Create department (only admin/super admin)
router.post(
  '/',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  DepartmentController.createDepartment
);

// Get all departments (admin/super admin see only their created departments)
router.get(
  '/',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR),
  DepartmentController.getAllDepartments
);

// Get single department
router.get(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR),
  DepartmentController.getSingleDepartment
);

// Update department (only admin/super admin)
router.patch(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  DepartmentController.updateDepartment
);

// Delete department (only admin/super admin)
router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  DepartmentController.deleteDepartment
);

export const DepartmentRoutes = router;

