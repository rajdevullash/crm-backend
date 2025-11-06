// Your service code here
import httpStatus from 'http-status';
import { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { Lead } from '../lead/lead.model';
import { stageSearchableFields } from './stage.constant';
import { IStage, IStageFilters } from './stage.interface';
import { Stage } from './stage.model';

const createStage = async (data: IStage): Promise<IStage> => {
  const result = await Stage.create(data);
  return result;
};

//get all stages
const getAllStages = async (
  filters: IStageFilters,
  paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<IStage[]>> => {
  // Extract searchTerm to implement search query
  const { searchTerm, ...filtersData } = filters;

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];
  // Search needs $or for searching in specified fields
  if (searchTerm) {
    andConditions.push({
      $or: stageSearchableFields.map(field => ({
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

  // Dynamic  Sort needs  field to  do sorting sort positions 0-n

  const sortConditions: { [key: string]: SortOrder } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }
  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Stage.find(whereConditions)
    .sort({ position: 1 })
    .skip(skip)
    .limit(limit);

  console.log(result);

  const total = await Stage.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

//get single stage
const getSingleStage = async (id: string): Promise<IStage | null> => {
  if (!id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Stage ID is required');
  }

  const result = await Stage.findById(id);
  return result;
};

//update stage
const updateStage = async (
  id: string,
  payload: Partial<IStage>,
): Promise<IStage | null> => {
  const existingStage = await Stage.findOne({ _id: id });
  if (!existingStage) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stage not found');
  }
  const result = await Stage.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

//delete stage
const deleteStage = async (id: string): Promise<IStage | null> => {
  const existingStage = await Stage.findOne({ _id: id });
  if (!existingStage) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stage not found');
  }

  // Before deleting the stage, check if any leads are associated with it if associated leads exist delete it first do it with mongoose transaction
  const associatedLeads = await Lead.find({ stage: id });
  //if associated leads exist delete them first
  if (associatedLeads.length > 0) {
    await Lead.deleteMany({ stage: id });
  }

  const result = await Stage.findByIdAndDelete(id);
  return result;

};

//reorder stages
const reorderStages = async (
  sourceIndex: number,
  destinationIndex: number,
): Promise<IStage[]> => {
  // Fetch all stages sorted by current position
  const stages = await Stage.find().sort({ position: 1 });

  if (
    sourceIndex < 0 ||
    destinationIndex < 0 ||
    sourceIndex >= stages.length ||
    destinationIndex >= stages.length
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Invalid source or destination index',
    );
  }

  // Remove the stage from source index and insert it at destination index
  const [movedStage] = stages.splice(sourceIndex, 1);
  stages.splice(destinationIndex, 0, movedStage);

  // Prepare bulk operations
  const bulkOps = stages.map((stage, index) => ({
    updateOne: {
      filter: { _id: stage._id },
      update: { $set: { position: index } }, // Update position in one go
    },
  }));

  // Execute bulk operation
  if (bulkOps.length > 0) {
    await Stage.bulkWrite(bulkOps);
  }

  // Return updated stages sorted by new position
  const updatedStages = await Stage.find().sort({ position: 1 });
  return updatedStages;
};

export const StageService = {
  createStage,
  getAllStages,
  getSingleStage,
  updateStage,
  deleteStage,
  reorderStages,
};
