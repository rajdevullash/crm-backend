import { Request, Response } from 'express';
import httpStatus from 'http-status';
import config from '../../../config';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
// import { IUserLoginResponse } from './auth.interface';
import { AuthService } from './auth.service';
import { authFilterableFields } from './auth.constant';
import { paginationFields } from '../../../constants/pagination';
import pick from '../../../shared/pick';
import { ENUM_USER_ROLE } from '../../../enums/user';


const createUser = catchAsync(async (req: Request, res: Response) => {
  const profileImage = req.file ? `/uploads/profileImages/${req.file.filename}` : null;

  const data = {
    ...req.body,
    profileImage,
  };

  const result = await AuthService.createUser(data);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User created successfully',
    data: result,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { ...loginData } = req.body;
  console.log('controller data', req.body);
  const result = await AuthService.loginUser(loginData);
  const { user, accessToken, refreshToken } = result;

  // Set tokens in cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.env === 'production',
    maxAge: Number(config.jwt.cookie_expires_in) * 60 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    maxAge: Number(config.jwt.refresh_cookie_expires_in) * 60 * 60 * 1000,
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Login successful',
    user,
    accessToken,
    refreshToken,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  const newAccessToken = await AuthService.refreshAccessToken(refreshToken);

  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: config.env === 'production',
    maxAge: Number(config.jwt.cookie_expires_in) * 60 * 60 * 1000, // hr
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Access token refreshed',
    newAccessToken,
    refreshToken,
  });
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
  await AuthService.logoutUser();

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged out successfully',
  });
});


//update user
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user; // Get the authenticated user from the auth middleware

  console.log('Update user request received for ID:', id);
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);

  // Security check: Representatives can only update their own profile
  if (user?.role === 'representative' && user?.userId !== id) {
    return res.status(httpStatus.FORBIDDEN).json({
      success: false,
      message: 'You can only update your own profile',
    });
  }

  const profileImage = req.file ? `/uploads/profileImages/${req.file.filename}` : undefined;
  console.log('Profile image path:', profileImage);

  const payload = {
    ...req.body,
    ...(profileImage && { profileImage }),
  };

  console.log('Final payload to be updated:', payload);

  const result = await AuthService.updateUser(id, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User updated successfully',
    data: result,
  });
});

//get all users
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, authFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await AuthService.getAllUsers(
    filters,
    paginationOptions,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users fetched successfully',
    data: result,
  });
});

//get all users for admin (no role filtering)
const getAllUsersForAdmin = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, authFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await AuthService.getAllUsersForAdmin(
    filters,
    paginationOptions,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All users fetched successfully',
    data: result,
  });
});

//get single user
const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AuthService.getSingleUser(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User fetched successfully',
    data: result,
  });
});

//get profile
const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await AuthService.getProfile(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile fetched successfully',
    data: result,
  });
});

//delete user
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AuthService.deleteUser(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});

// HR Management Controllers (Admin and Super Admin only)
const createHR = catchAsync(async (req: Request, res: Response) => {
  const profileImage = req.file ? `/uploads/profileImages/${req.file.filename}` : null;

  const data = {
    ...req.body,
    role: 'hr', // Force role to be HR
    profileImage,
  };

  const result = await AuthService.createUser(data);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'HR user created successfully',
    data: result,
  });
});

const getAllHR = catchAsync(async (req: Request, res: Response) => {
  const filters = { ...pick(req.query, authFilterableFields), role: ENUM_USER_ROLE.HR };
  const paginationOptions = pick(req.query, paginationFields);

  const result = await AuthService.getAllUsers(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'HR users retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSingleHR = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AuthService.getSingleUser(id);

  // Verify the user is actually HR
  if (result && result.role !== 'hr') {
    return res.status(httpStatus.NOT_FOUND).json({
      success: false,
      message: 'HR user not found',
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'HR user retrieved successfully',
    data: result,
  });
});

const updateHR = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const profileImage = req.file ? `/uploads/profileImages/${req.file.filename}` : undefined;

  const data = {
    ...req.body,
    role: 'hr', // Ensure role remains HR
    ...(profileImage && { profileImage }),
  };

  const result = await AuthService.updateUser(id, data);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'HR user updated successfully',
    data: result,
  });
});

const deleteHR = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Verify the user is HR before deleting
  const user = await AuthService.getSingleUser(id);
  if (user && user.role !== 'hr') {
    return res.status(httpStatus.FORBIDDEN).json({
      success: false,
      message: 'Cannot delete non-HR user through this endpoint',
    });
  }

  const result = await AuthService.deleteUser(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'HR user deleted successfully',
    data: result,
  });
});

export const AuthController = {
  createUser,
  loginUser,
  refreshToken,
  getAllUsers,
  getAllUsersForAdmin,
  getSingleUser,
  getProfile,
  updateUser,
  logoutUser,
  deleteUser,
  // HR Management
  createHR,
  getAllHR,
  getSingleHR,
  updateHR,
  deleteHR,
};
