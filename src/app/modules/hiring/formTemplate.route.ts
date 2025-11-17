import express from 'express';
import { createFormTemplate, getFormTemplates, getFormTemplateByJob, updateFormTemplate, deleteFormTemplate } from './formTemplate.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { checkPermission } from '../../middlewares/permission';
import { ENUM_PERMISSION } from '../permission/permission.interface';

const router = express.Router();

// Only admin, super admin, HR can manage form templates
router.post('/', auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR), checkPermission(ENUM_PERMISSION.HR_JOB_CREATE), createFormTemplate);
router.get('/', auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR), getFormTemplates);
router.get('/job/:jobId', getFormTemplateByJob);
router.patch('/:id', auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR), checkPermission(ENUM_PERMISSION.HR_JOB_EDIT), updateFormTemplate);
router.delete('/:id', auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.HR), checkPermission(ENUM_PERMISSION.HR_JOB_DELETE), deleteFormTemplate);

export default router;
