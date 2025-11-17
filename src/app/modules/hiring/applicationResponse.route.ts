import express from 'express';
import { submitApplicationResponses, getApplicationResponses } from './applicationResponse.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { checkPermission } from '../../middlewares/permission';
import { ENUM_PERMISSION } from '../permission/permission.interface';

const router = express.Router();

// Submit responses (applicant, HR, admin)
router.post('/', submitApplicationResponses);

// Get responses for an application (HR, admin, super admin)
router.get('/:applicationId', auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN), checkPermission(ENUM_PERMISSION.HR_APPLICATION_VIEW), getApplicationResponses);

export default router;
