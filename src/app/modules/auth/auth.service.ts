import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
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
import { SortOrder } from 'mongoose';

const createUser = async (user: IUser): Promise<Omit<IUser, 'password'>> => {
  const { profileImage } = user;

  // Validate that profileImage exists
  if (!profileImage) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Profile image is required');
  }
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

  // Create user with hashed password and FORCE role to be CUSTOMER
  const createdUser = await User.create({
    ...user,
    password: hashedPassword,
    profileImage: profileImage,
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
  console.log('id', id);
  const existingUser = await User.findOne({ _id: id });
  if (!existingUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // If password is being updated, hash the new password
  if (payload.password) {
    //check if the
    payload.password = await bcrypt.hash(
      payload.password,
      Number(config.bycrypt_salt_rounds),
    );
  }

  // Perform the update in the database
  const result = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

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

  // Dynamic  Sort needs  field to  do sorting
  const sortConditions: { [key: string]: SortOrder } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }
  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await User.find(whereConditions)
      .where('role').equals(ENUM_USER_ROLE.REPRESENTATIVE)
      .select('-password')
      .sort(sortConditions)
      .skip(skip)
      .limit(limit);
  
    console.log(result);
  
    const total = await User.countDocuments(whereConditions);
  
    return {
      meta: {
        page,
        limit,
        total,
      },
      data: result,
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
  const user = await User.findById(id).select('-password');
  console.log('User Profile:', user);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

export const AuthService = {
  createUser,
  loginUser,
  refreshAccessToken,
  getProfile,
  getSingleUser,
  getAllUsers,
  logoutUser,
  updateUser,
  deleteUser,
};
