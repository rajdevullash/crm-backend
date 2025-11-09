import { ENUM_USER_ROLE } from '../../../enums/user';

export type IUser = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: ENUM_USER_ROLE;
  profileImage?: string | null;
  joinDate?: Date; // ISO date string (e.g. "2025-10-05T08:45:00.000Z")
  incentivePercentage?: number; // Incentive % for representatives
  performancePoint?: number;
  totalLeads?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convertedLeads?: any[];
  tasksCompleted?: number;
};

export type IUserLogin = {
  email: string;
  password: string;
};

export type IUserLoginResponse = {
  user: {
    userId: string;
    email: string;
    role: ENUM_USER_ROLE;
    name: string;
  };
  accessToken: string;
  refreshToken?: string;
};

export type IRefreshTokenResponse = {
  accessToken: string;
};

export type ITokenPayload = {
  userId: string;
  name: string;
  email: string;
  role: ENUM_USER_ROLE;
};

export type IAuthFilters = {
  searchTerm?: string;
  role?: ENUM_USER_ROLE;
  email?: string;
  name?: string;
  phoneNumber?: string;
  address?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
