import express from 'express';
import { ENUM_USER_ROLE } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { checkPermission } from '../../middlewares/permission';
import { ENUM_PERMISSION } from '../permission/permission.interface';
import { ResourceController } from './resource.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ResourceValidation } from './resource.validation';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for resource attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to backend/uploads/resources (root uploads directory, not src/uploads)
    // This matches where static files are served from
    let uploadPath: string;
    
    // Always use process.cwd() to get the backend root directory
    // eslint-disable-next-line prefer-const
    uploadPath = path.join(process.cwd(), 'uploads', 'resources');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadResourceFiles = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for resources
    cb(null, true);
  },
});

// Resource Routes - Using Permission-Based Access
router.post(
  '/',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_CREATE),
  validateRequest(ResourceValidation.createResourceZodSchema),
  ResourceController.createResource
);

router.get(
  '/',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_VIEW),
  ResourceController.getAllResources
);

router.get(
  '/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_VIEW),
  ResourceController.getSingleResource
);

router.patch(
  '/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_EDIT),
  validateRequest(ResourceValidation.updateResourceZodSchema),
  ResourceController.updateResource
);

router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_DELETE),
  ResourceController.deleteResource
);

router.post(
  '/:id/attachments',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_EDIT),
  uploadResourceFiles.single('attachment'),
  ResourceController.addAttachment
);

router.patch(
  '/:id/attachments',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_EDIT),
  ResourceController.updateAttachment
);

router.delete(
  '/:id/attachments',
  auth(ENUM_USER_ROLE.HR, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  checkPermission(ENUM_PERMISSION.HR_RESOURCE_EDIT),
  ResourceController.removeAttachment
);

export const ResourceRoutes = router;

