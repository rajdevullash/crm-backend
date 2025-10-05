// Your service code here
import httpStatus from 'http-status';
import { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { ITask, ITaskFilters } from './task.interface';
import { Task } from './task.model';
import { taskFilterableFields } from './task.constant';



const createTask = async (payload: ITask): Promise<ITask | null> => {
    const result = await Task.create(payload);
  return result;
};

//get all tasks
const getAllTasks = async (
  filters: ITaskFilters,
  paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<ITask[]>> => {
  // Extract searchTerm to implement search query
  const { searchTerm, ...filtersData } = filters;



  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];
  // Search needs $or for searching in specified fields
  if (searchTerm) {
    andConditions.push({
      $or: taskFilterableFields.map(field => ({
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

  const result = await Task.find(whereConditions)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  console.log(result);

  const total = await Task.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};
//get specific task
const getSpecificTask = async (id: string): Promise<ITask | null> => {
  const result = await Task.findById(id);
  return result;
}


//update task
const updateTask = async (
  id: string,
  payload: Partial<ITask>,
): Promise<ITask | null> => {
  console.log('id', id);
  const existingTask = await Task.findOne({ _id: id });
  if (!existingTask) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }

  // Perform the update in the database
  const result = await Task.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  return result;
};

//delete task
const deleteTask = async (id: string): Promise<ITask | null> => {
  const existingTask = await Task.findOne({
    _id: id,
  });
  if (!existingTask) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  await Task.findOneAndDelete({
    _id: id,
  });
  return null;
};

export const TaskService = {
  createTask,
  getAllTasks,
  getSpecificTask,
  updateTask,
  deleteTask,
};

