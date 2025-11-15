import express from 'express';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { uploadProfileImage } from '../../../shared/multerLocal';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';

const router = express.Router();

router.get(
  '/get-all-users',
  auth(ENUM_USER_ROLE.SUPER_ADMIN,ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  AuthController.getAllUsers
)

// Admin route to get all users regardless of role
router.get(
  '/admin/get-all-users',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  AuthController.getAllUsersForAdmin
)

router.get(
  '/single-user/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  AuthController.getSingleUser
);

router.get(
  '/profile',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE, ENUM_USER_ROLE.HR),
  AuthController.getProfile
);

router.patch(
  '/:id',
  (req, res, next) => {
    uploadProfileImage(req, res, (err: any) => {
      if (err) {
        // Handle multer errors (file size, file type, etc.)
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum size is 10MB',
          });
        }
        if (err.message && (err.message.includes('JPG') || err.message.includes('PNG') || err.message.includes('WEBP') || err.message.includes('image'))) {
          return res.status(400).json({
            success: false,
            message: err.message || 'Image format mismatch. Only JPG, JPEG, PNG, and WEBP formats are allowed',
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Failed to upload image',
        });
      }
      next();
    });
  },
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE, ENUM_USER_ROLE.HR),
  AuthController.updateUser
)

router.post(
  '/register',
  uploadProfileImage,
  validateRequest(AuthValidation.createUserZodSchema),
  AuthController.createUser,
);

router.post(
  '/login',
  validateRequest(AuthValidation.loginZodSchema),
  AuthController.loginUser,
);

router.post('/refresh-token', AuthController.refreshToken);

router.post('/logout', AuthController.logoutUser);

router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  AuthController.deleteUser
);

// HR Management Routes (Admin and Super Admin only)
router.post(
  '/hr/create',
  uploadProfileImage,
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  validateRequest(AuthValidation.createUserZodSchema),
  AuthController.createHR
);

router.get(
  '/hr/get-all',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  AuthController.getAllHR
);

router.get(
  '/hr/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  AuthController.getSingleHR
);

router.patch(
  '/hr/:id',
  uploadProfileImage,
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  AuthController.updateHR
);

router.delete(
  '/hr/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  AuthController.deleteHR
);

export const AuthRoutes = router;
