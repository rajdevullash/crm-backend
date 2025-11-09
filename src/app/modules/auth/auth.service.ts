import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../../../config';
import { ENUM_USER_ROLE } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import {
  IAuthFilters,
  ITokenPayload,
  IUser,
  IUserLogin,
  IUserLoginResponse,
} from './auth.interface';
import { User } from './auth.model';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { authSearchableFields } from './auth.constant';

const createUser = async (user: IUser): Promise<Omit<IUser, 'password'>> => {
  const { profileImage } = user;

  // Check if email already exists
  const existingUser = await User.findOne({ email: user.email });
  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, 'Email already exists');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(
    user.password,
    Number(config.bycrypt_salt_rounds),
  );

  // Create user with hashed password - profileImage is optional
  const createdUser = await User.create({
    ...user,
    password: hashedPassword,
    profileImage: profileImage || null, // Use null if no image provided
  });

  // Fetch the user again without the password field
  // const userWithoutPassword = await User.findById(createdUser._id)
  //   .select('-password')
  //   .lean();

  // if (!userWithoutPassword) {
  //   throw new ApiError(
  //     httpStatus.INTERNAL_SERVER_ERROR,
  //     'User creation failed',
  //   );
  // }

  // return userWithoutPassword;

  return createdUser;
};

const loginUser = async (payload: IUserLogin): Promise<IUserLoginResponse> => {
  const { email, password } = payload;

  const user = await User.findOne({ email: email }).select('+password');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User does not exist');
  }

  // Directly compare passwords using bcrypt
  const isPasswordMatched = await bcrypt.compare(password, user.password);
  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect password');
  }

  // const { _id: userId, role } = user;
  // const accessToken = jwtHelpers.createToken(
  //   { userId, role },
  //   config.jwt.secret as string,
  //   config.jwt.expires_in as string
  // );
  const tokenPayload: ITokenPayload = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as ENUM_USER_ROLE,
  };

  const accessToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.secret as Secret,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.jwt.expires_in as any,
  );

  const refreshToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.refresh_secret as Secret,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.jwt.refresh_expires_in as any,
  );

  return {
    user: {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as ENUM_USER_ROLE,
      name: user.name,
    },
    accessToken,
    refreshToken,
  };
};

const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const decoded = jwtHelpers.verifyToken(
    refreshToken,
    config.jwt.refresh_secret as string,
  );

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const tokenPayload: ITokenPayload = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as ENUM_USER_ROLE,
  };

  const newAccessToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.secret as Secret,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.jwt.expires_in as any,
  );

  return newAccessToken;
};

const logoutUser = async (): Promise<void> => {
  // In a stateless JWT system, logout is handled client-side by token deletion
  // If using refresh tokens, you might want to implement a token blacklist here
};

//update user
const updateUser = async (
  id: string,
  payload: Partial<IUser>,
): Promise<IUser | null> => {
  console.log('Service updateUser - id:', id);
  console.log('Service updateUser - payload:', payload);
  
  const existingUser = await User.findOne({ _id: id });
  if (!existingUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  console.log('Existing user found:', existingUser.email);
  console.log('Existing user profileImage:', existingUser.profileImage);

  // Remove undefined, null, and empty string fields from payload
  const cleanPayload: Partial<IUser> = {};
  Object.keys(payload).forEach((key) => {
    const value = payload[key as keyof IUser];
    if (value !== undefined && value !== null && value !== '') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanPayload[key as keyof IUser] = value as any;
    }
  });

  console.log('Clean payload after removing empty values:', cleanPayload);

  // If password is being updated, hash the new password
  if (cleanPayload.password) {
    cleanPayload.password = await bcrypt.hash(
      cleanPayload.password,
      Number(config.bycrypt_salt_rounds),
    );
  }

  console.log('About to update with clean payload:', cleanPayload);

  // Perform the update in the database - only updates fields present in cleanPayload
  const result = await User.findOneAndUpdate({ _id: id }, cleanPayload, {
    new: true,
  });

  console.log('Update result - profileImage:', result?.profileImage);
  console.log('Update complete - returning user:', result?.email);

  return result;
};

//get all users
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface IGetAllUsersResponse {
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  data: IUser[];
}

const getAllUsers = async (
  filters: IAuthFilters,
  paginationOptions: IPaginationOptions,
): Promise<IGetAllUsersResponse> => {
  const { searchTerm, ...filtersData } = filters;

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];

  // Add role filter for representatives
  andConditions.push({
    role: ENUM_USER_ROLE.REPRESENTATIVE,
  });

  // Search needs $or for searching in specified fields
  if (searchTerm) {
    andConditions.push({
      $or: authSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }
  // Filters needs $and to fullfill all the conditions
  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  // Dynamic Sort needs field to do sorting
  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }
  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  // Use aggregation to include activities statistics from leads
  const result = await User.aggregate([
    // Match users based on filters
    {
      $match: whereConditions,
    },
    
    // Lookup leads assigned to each user (representative) - keep leads array for counting
    {
      $lookup: {
        from: 'leads',
        localField: '_id',
        foreignField: 'assignedTo',
        as: 'assignedLeads',
      },
    },
    
    // Lookup leads again to unwind for activities (need separate lookup for unwinding)
    {
      $lookup: {
        from: 'leads',
        localField: '_id',
        foreignField: 'assignedTo',
        as: 'leads',
      },
    },
    
    // Unwind leads to access activities
    {
      $unwind: {
        path: '$leads',
        preserveNullAndEmptyArrays: true,
      },
    },
    
    // Unwind activities from each lead
    {
      $unwind: {
        path: '$leads.activities',
        preserveNullAndEmptyArrays: true,
      },
    },
    
    // Group back to calculate activities statistics
    {
      $group: {
        _id: '$_id',
        // Keep all original user fields
        name: { $first: '$name' },
        email: { $first: '$email' },
        role: { $first: '$role' },
        phone: { $first: '$phone' },
        address: { $first: '$address' },
        profileImage: { $first: '$profileImage' },
        incentivePercentage: { $first: '$incentivePercentage' },
        assignedLeads: { $first: '$assignedLeads' }, // Keep assignedLeads array for counting
        convertedLeads: { $first: '$convertedLeads' },
        createdAt: { $first: '$createdAt' },
        updatedAt: { $first: '$updatedAt' },
        
        // Calculate activities statistics
        activities: { $push: '$leads.activities' },
      },
    },
    
    // Add fields: calculate totalLeads count and activities counts
    {
      $addFields: {
        // Calculate totalLeads from assignedLeads array count
        totalLeads: {
          $cond: {
            if: { $isArray: "$assignedLeads" },
            then: { $size: "$assignedLeads" },
            else: 0
          }
        },
        
        // Calculate convertedLeads count
        convertedLeadsCount: {
          $cond: {
            if: { $isArray: "$convertedLeads" },
            then: { $size: "$convertedLeads" },
            else: 0
          }
        },
        completedActivities: {
          $size: {
            $filter: {
              input: '$activities',
              as: 'activity',
              cond: { 
                $and: [
                  { $ne: ['$$activity', null] },
                  { $eq: ['$$activity.completed', true] }
                ]
              },
            },
          },
        },
        upcomingActivities: {
          $size: {
            $filter: {
              input: '$activities',
              as: 'activity',
              cond: { 
                $and: [
                  { $ne: ['$$activity', null] },
                  { $ne: ['$$activity.completed', true] },
                  { 
                    $gte: [
                      { 
                        $dateFromParts: {
                          year: { $year: '$$activity.date' },
                          month: { $month: '$$activity.date' },
                          day: { $dayOfMonth: '$$activity.date' }
                        }
                      },
                      { 
                        $dateFromParts: {
                          year: { $year: new Date() },
                          month: { $month: new Date() },
                          day: { $dayOfMonth: new Date() }
                        }
                      }
                    ]
                  }
                ]
              },
            },
          },
        },
        overdueActivities: {
          $size: {
            $filter: {
              input: '$activities',
              as: 'activity',
              cond: { 
                $and: [
                  { $ne: ['$$activity', null] },
                  { $ne: ['$$activity.completed', true] },
                  { 
                    $lt: [
                      { 
                        $dateFromParts: {
                          year: { $year: '$$activity.date' },
                          month: { $month: '$$activity.date' },
                          day: { $dayOfMonth: '$$activity.date' }
                        }
                      },
                      { 
                        $dateFromParts: {
                          year: { $year: new Date() },
                          month: { $month: new Date() },
                          day: { $dayOfMonth: new Date() }
                        }
                      }
                    ]
                  }
                ]
              },
            },
          },
        },
        totalActivities: {
          $size: {
            $filter: {
              input: '$activities',
              as: 'activity',
              cond: { $ne: ['$$activity', null] }
            }
          }
        },
      },
    },
    
    // Remove password, activities array, and assignedLeads array from output
    {
      $project: {
        password: 0,
        activities: 0,
        assignedLeads: 0, // Remove assignedLeads array, keep only totalLeads count
      },
    },
    
    // Apply sorting
    ...(Object.keys(sortConditions).length > 0 ? [{ $sort: sortConditions }] : []),
    
    // Get total count before pagination
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const total = result[0]?.metadata[0]?.total || 0;
  const data = result[0]?.data || [];

  console.log(data);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: data,
  };
};

// Get all users for admin (no role filtering)
const getAllUsersForAdmin = async (
  filters: IAuthFilters,
  paginationOptions: IPaginationOptions,
): Promise<IGetAllUsersResponse> => {
  const { searchTerm, ...filtersData } = filters;

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];

  // Search needs $or for searching in specified fields
  if (searchTerm) {
    andConditions.push({
      $or: authSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }
  
  // Filters needs $and to fullfill all the conditions
  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  // Dynamic Sort needs field to do sorting
  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }
  
  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await User.aggregate([
    {
      $match: whereConditions,
    },
    {
      $sort: sortConditions,
    },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              password: 0,
            },
          },
        ],
      },
    },
  ]);

  const total = result[0]?.metadata[0]?.total || 0;
  const data = result[0]?.data || [];

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: data,
  };
};

//get single user
const getSingleUser = async (id: string): Promise<IUser | null> => {
  const user = await User.findById(id).select('-password');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

//delete user
const deleteUser = async (id: string): Promise<IUser | null> => {
  const user = await User.findByIdAndDelete(id).select('-password');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

//get profile
const getProfile = async (id: string): Promise<IUser | null> => {
  const userId = new mongoose.Types.ObjectId(id);
  
  // First get the user to check their role
  const userDoc = await User.findById(userId).select('-password');
  if (!userDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  const isAdmin = userDoc.role === ENUM_USER_ROLE.ADMIN || userDoc.role === ENUM_USER_ROLE.SUPER_ADMIN;
  
  // Import Lead and DealCloseRequest models
  const { Lead } = await import('../lead/lead.model');
  const { DealCloseRequest } = await import('../dealCloseRequest/dealCloseRequest.model');
  
  let totalLeads = 0;
  let convertedLeadsCount = 0;
  
  if (isAdmin) {
    // For admin/super_admin: count all leads in system
    totalLeads = await Lead.countDocuments({});
    
    // For admin/super_admin: count all approved close requests
    convertedLeadsCount = await DealCloseRequest.countDocuments({ status: 'approved' });
  } else {
    // For representatives: count assigned leads
    totalLeads = await Lead.countDocuments({ assignedTo: userId });
    
    // For representatives: count their approved close requests
    convertedLeadsCount = await DealCloseRequest.countDocuments({
      representative: userId,
      status: 'approved',
    });
  }
  
  // Convert user document to plain object and add calculated stats
  const user = userDoc.toObject() as any;
  user.totalLeads = totalLeads;
  user.convertedLeadsCount = convertedLeadsCount;
  
  console.log('User Profile with calculated stats:', {
    userId: id,
    role: user.role,
    totalLeads,
    convertedLeadsCount,
  });
  
  return user as IUser;
};

export const AuthService = {
  createUser,
  loginUser,
  refreshAccessToken,
  getProfile,
  getSingleUser,
  getAllUsers,
  getAllUsersForAdmin,
  logoutUser,
  updateUser,
  deleteUser,
};
