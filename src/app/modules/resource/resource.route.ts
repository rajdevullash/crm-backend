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
    // Save to backend/uploads/resources (or backend/src/uploads/resources in source)
    let uploadPath: string;
    if (__dirname.includes('dist')) {
      // In compiled code, __dirname is backend/dist/app/modules/resource
      uploadPath = path.join(__dirname, '../../../uploads/resources');
    } else {
      // In source code, __dirname is backend/src/app/modules/resource
      // Try to save to backend/uploads/resources first, fallback to src/uploads/resources
      uploadPath = path.join(__dirname, '../../../uploads/resources');
      if (!fs.existsSync(path.dirname(uploadPath))) {
        uploadPath = path.join(process.cwd(), 'uploads', 'resources');
      }
    }
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

