
// Define your routes here
import express from 'express';
import { ENUM_USER_ROLE } from '../../../enums/user';
import auth from '../../middlewares/auth';
// import validateRequest from '../../middlewares/validateRequest';
import { LeadController } from './lead.controller';
// import { LeadValidation } from './lead.validation';
import { uploadLeadAttachments } from '../../../shared/uploadLeadAttachments';

const router = express.Router();

router.get(
  '/get-all-leads',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  LeadController.getAllLeads
);

router.get(
  '/get-all-activities',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  LeadController.getAllActivities
);

router.post(
  '/reorder-leads',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  LeadController.reorderLeads
);

router.get(
  '/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  LeadController.getSpecificLead
);

router.post(
  '/create-lead',
  uploadLeadAttachments,
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  // validateRequest(LeadValidation.createLeadValidationSchema),
  LeadController.createLead,
);

router.patch(
  '/:id',
  uploadLeadAttachments,
    auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  // validateRequest(LeadValidation.updateLeadValidationSchema),
  LeadController.updateLead
);

router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  LeadController.deleteLead
);

export const LeadRoutes = router;


