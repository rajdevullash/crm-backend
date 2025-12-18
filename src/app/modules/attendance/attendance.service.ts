import { SortOrder } from 'mongoose';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { Attendance } from './attendance.model';
import { IAttendance } from './attendance.interface';
import { Resource } from '../resource/resource.model';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';

const checkIn = async (payload: { employeeId: string; workMode?: string; notes?: string; checkInTime?: string }): Promise<IAttendance> => {
  const { employeeId, workMode, notes, checkInTime } = payload;

  // Verify resource exists
  const resource = await Resource.findOne({ employeeId });
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found');
  }

  const now = checkInTime ? new Date(checkInTime) : new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Check if already checked in
  const existingAttendance = await Attendance.findOne({
    employeeId,
    date: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  if (existingAttendance) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Already checked in for today');
  }

  const shiftStart = new Date(now);
  shiftStart.setHours(9, 0, 0, 0); // Assuming 9:00 AM start

  const status: string[] = ['Present'];
  let lateBy = '';

  // Calculate Late
  if (now > shiftStart) {
    status.push('Late');
    const diff = now.getTime() - shiftStart.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    lateBy = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else {
    status.push('On-time');
  }

  const result = await Attendance.create({
    employeeId,
    resourceId: resource._id,
    date: now,
    checkIn: now,
    status,
    workMode: workMode || 'On-site',
    lateBy,
    notes,
  });

  return result;
};

const checkOut = async (payload: { employeeId: string; notes?: string; checkOutTime?: string }): Promise<IAttendance | null> => {
  const { employeeId, notes, checkOutTime } = payload;

  const now = checkOutTime ? new Date(checkOutTime) : new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    employeeId,
    date: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No check-in record found for today');
  }

  if (attendance.checkOut) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Already checked out for today');
  }

  attendance.checkOut = now;
  if (notes) attendance.notes = attendance.notes ? `${attendance.notes}\n${notes}` : notes;

  // Calculate Total Hours
  if (attendance.checkIn) {
    const diff = now.getTime() - attendance.checkIn.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    attendance.totalHours = `${hours}h ${mins}m`;

    // Calculate Overtime (assuming 9 hours shift)
    if (hours >= 9) {
      const otMinutes = minutes - 9 * 60;
      if (otMinutes > 0) {
        const otH = Math.floor(otMinutes / 60);
        const otM = otMinutes % 60;
        attendance.overtime = `+${otH}h ${otM}m OT`;
        attendance.status.push('Overtime');
      }
    }
  }

  await attendance.save();
  return attendance;
};

const getAllAttendance = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IAttendance[]>> => {
  const { searchTerm, date, department, status, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } = paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];

  // Search by name or employeeId (requires lookup on Resource)
  if (searchTerm) {
    // We'll handle this by finding matching resources first
    const resources = await Resource.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { employeeId: { $regex: searchTerm, $options: 'i' } },
      ],
    }).select('_id');
    
    const resourceIds = resources.map(r => r._id);
    andConditions.push({ resourceId: { $in: resourceIds } });
  }

  if (date) {
    const queryDate = new Date(date);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    andConditions.push({
      date: {
        $gte: queryDate,
        $lt: nextDay,
      },
    });
  }

  if (status) {
    andConditions.push({ status: { $in: [status] } });
  }

  if (department) {
    const resources = await Resource.find({ department }).select('_id');
    const resourceIds = resources.map(r => r._id);
    andConditions.push({ resourceId: { $in: resourceIds } });
  }

  if (Object.keys(filterData).length) {
    andConditions.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const sortConditions: { [key: string]: SortOrder } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const whereConditions = andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Attendance.find(whereConditions)
    .populate('resourceId', 'name employeeId department position avatar') // Populate resource details
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Attendance.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getDailyStats = async (date: Date = new Date()) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const stats = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: startOfDay, $lte: endOfDay },
      },
    },
    {
      $group: {
        _id: null,
        totalPresent: { $sum: 1 },
        onSite: {
          $sum: { $cond: [{ $eq: ['$workMode', 'On-site'] }, 1, 0] },
        },
        remote: {
          $sum: { $cond: [{ $eq: ['$workMode', 'Remote'] }, 1, 0] },
        },
        late: {
          $sum: { $cond: [{ $in: ['Late', '$status'] }, 1, 0] },
        },
        missingPunch: {
          $sum: { 
            $cond: [
              { $and: [{ $ne: ['$checkIn', null] }, { $eq: ['$checkOut', null] }] }, 
              1, 
              0 
            ] 
          },
        },
      },
    },
  ]);

  return stats[0] || { totalPresent: 0, onSite: 0, remote: 0, late: 0, missingPunch: 0 };
};

export const AttendanceService = {
  checkIn,
  checkOut,
  getAllAttendance,
  getDailyStats,
};
