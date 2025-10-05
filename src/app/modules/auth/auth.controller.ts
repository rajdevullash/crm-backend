import { Request, Response } from 'express';
import httpStatus from 'http-status';
import config from '../../../config';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
// import { IUserLoginResponse } from './auth.interface';
import { AuthService } from './auth.service';


const createUser = catchAsync(async (req: Request, res: Response) => {
  console.log('Request Body:', req.body);
  console.log('File Info:', req.file);

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
  console.log('Request Body:', req.body);
  console.log('File Info:', req.file);

  const profileImage = req.file ? `/uploads/profileImages/${req.file.filename}` : undefined;

  const payload = {
    ...req.body,
    ...(profileImage && { profileImage }),
  };

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
  const result = await AuthService.getAllUsers();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users fetched successfully',
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

export const AuthController = {
  createUser,
  loginUser,
  refreshToken,
  getAllUsers,
  getSingleUser,
  updateUser,
  logoutUser,
};
