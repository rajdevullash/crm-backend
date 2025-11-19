import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IStandaloneActivity, StandaloneActivity } from './standaloneActivity.model';
import { ICreateStandaloneActivity, IStandaloneActivityFilters, IUpdateStandaloneActivity } from './standaloneActivity.interface';

const createStandaloneActivity = async (payload: ICreateStandaloneActivity): Promise<IStandaloneActivity> => {
  const activity = await StandaloneActivity.create(payload);
  return activity;
};

const getAllStandaloneActivities = async (
  filters: IStandaloneActivityFilters,
  userId?: string
): Promise<IStandaloneActivity[]> => {
  const query: Record<string, unknown> = {};

  if (filters.addedBy) {
    query.addedBy = filters.addedBy;
  } else if (userId) {
    // If no addedBy filter, show activities for current user
    query.addedBy = userId;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.completed !== undefined) {
    query.completed = filters.completed;
  }

  if (filters.startDate || filters.endDate) {
    query.date = {} as Record<string, Date>;
    if (filters.startDate) {
      (query.date as Record<string, Date>).$gte = filters.startDate;
    }
    if (filters.endDate) {
      (query.date as Record<string, Date>).$lte = filters.endDate;
    }
  }

  const activities = await StandaloneActivity.find(query)
    .populate('addedBy', 'name email')
    .populate('completedBy', 'name email')
    .sort({ date: -1 })
    .lean();

  return activities;
};

const getStandaloneActivityById = async (id: string): Promise<IStandaloneActivity | null> => {
  const activity = await StandaloneActivity.findById(id)
    .populate('addedBy', 'name email')
    .populate('completedBy', 'name email')
    .lean();

  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }

  return activity;
};

const updateStandaloneActivity = async (
  id: string,
  payload: IUpdateStandaloneActivity
): Promise<IStandaloneActivity | null> => {
  const activity = await StandaloneActivity.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true }
  )
    .populate('addedBy', 'name email')
    .populate('completedBy', 'name email')
    .lean();

  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }

  return activity;
};

const deleteStandaloneActivity = async (id: string): Promise<void> => {
  // Validate MongoDB ObjectId format
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid activity ID format');
  }

  const activity = await StandaloneActivity.findByIdAndDelete(id);

  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
};

export const standaloneActivityService = {
  createStandaloneActivity,
  getAllStandaloneActivities,
  getStandaloneActivityById,
  updateStandaloneActivity,
  deleteStandaloneActivity,
};

