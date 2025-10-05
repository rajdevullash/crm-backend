// Your service code here
import httpStatus from 'http-status';
import { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { leadFilterableFields } from './lead.constant';
import { ILead, ILeadFilters } from './lead.interface';
import { Lead } from './lead.model';

const createLead = async (payload: ILead): Promise<ILead | null> => {
    const result = await Lead.create(payload);
  return result;
};

//get all leads
const getAllLeads = async (
  filters: ILeadFilters,
  paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<ILead[]>> => {
  // Extract searchTerm to implement search query
  const { searchTerm, ...filtersData } = filters;



  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];
  // Search needs $or for searching in specified fields
  if (searchTerm) {
    andConditions.push({
      $or: leadFilterableFields.map(field => ({
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

  const result = await Lead.find(whereConditions)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  console.log(result);

  const total = await Lead.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

//get specific lead
const getSpecificLead = async (id: string): Promise<ILead | null> => {
  const result = await Lead.findById(id);
  return result;
}

const updateLead = async (
  id: string,
  payload: Partial<ILead>,
): Promise<ILead | null> => {
  console.log('id', id);
  const existingLead = await Lead.findOne({ _id: id });
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }


  

  // Perform the update in the database
  const result = await Lead.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  return result;
};

//delete lead
const deleteLead = async (id: string): Promise<ILead | null> => {
  const existingLead = await Lead.findOne({
    _id: id,
  });
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  await Lead.findOneAndDelete({
    _id: id,
  });
  return null;
};

export const LeadService = {
  createLead,
  getAllLeads,
  getSpecificLead,
  updateLead,
  deleteLead,
};

