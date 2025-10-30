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

router.get(
  '/single-user/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  AuthController.getSingleUser
);

router.get(
  '/profile',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
  AuthController.getProfile
);

router.patch(
  '/:id',
  uploadProfileImage,
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE),
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



export const AuthRoutes = router;
