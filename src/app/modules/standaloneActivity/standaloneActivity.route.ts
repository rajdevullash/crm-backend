import express, { Express } from 'express';
import auth from '../../middlewares/auth';
import { standaloneActivityController } from './standaloneActivity.controller';
import { ENUM_USER_ROLE } from '../../../enums/user';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for standalone activity attachments
const uploadDir = path.join(process.cwd(), 'uploads', 'standalone-activities');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, images, and document files are allowed!'));
  }
};

const uploadStandaloneAttachment = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post(
  '/',
  auth(ENUM_USER_ROLE.REPRESENTATIVE, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  uploadStandaloneAttachment.single('customAttachment'),
  standaloneActivityController.createStandaloneActivity
);

router.get(
  '/',
  auth(ENUM_USER_ROLE.REPRESENTATIVE, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),    
  standaloneActivityController.getAllStandaloneActivities
);

router.get(
  '/:id',
  auth(ENUM_USER_ROLE.REPRESENTATIVE, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  standaloneActivityController.getStandaloneActivityById
);

router.patch(
  '/:id',
  auth(ENUM_USER_ROLE.REPRESENTATIVE, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  uploadStandaloneAttachment.single('customAttachment'),
  standaloneActivityController.updateStandaloneActivity
);

router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.REPRESENTATIVE, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  standaloneActivityController.deleteStandaloneActivity
);

export default router;

