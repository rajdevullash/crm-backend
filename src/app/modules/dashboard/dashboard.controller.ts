import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DashboardService } from './dashboard.service';
import { emitDashboardEvent } from '../socket/socketService';

const getLeaderboard = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getLeaderboard();

  // Emit socket event to notify all connected clients about leaderboard update
  if (result) {
    console.log('📊 Leaderboard fetched, emitting socket event');
    
    // Target rooms for leaderboard updates (admins and super_admins typically view this)
    const targetRooms = [
      'role_admin',
      'role_super_admin',
      'role_representative', // Representatives might want to see their ranking
    ];

    emitDashboardEvent('leaderboard:updated', {
      message: 'Leaderboard data updated',
      leaderboard: result,
      timestamp: new Date().toISOString(),
    }, targetRooms);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Leaderboard retrieved successfully',
    data: result,
  });
});

const getRevenueOverview = catchAsync(async (req: Request, res: Response) => {
  const { year, month } = req.query;

  // Parse year and month from query params
  const yearNum = year ? parseInt(year as string, 10) : undefined;
  const monthNum = month ? parseInt(month as string, 10) : undefined;

  // Validate month range (1-12)
  if (monthNum && (monthNum < 1 || monthNum > 12)) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Month must be between 1 and 12',
      data: null,
    });
  }

  const result = await DashboardService.getRevenueOverview(yearNum, monthNum);

  // Emit socket event for revenue overview updates
  if (result) {
    console.log('💰 Revenue overview fetched, emitting socket event');
    
    const targetRooms = [
      'role_admin',
      'role_super_admin',
    ];

    emitDashboardEvent('revenue:updated', {
      message: 'Revenue overview data updated',
      summary: result.summary,
      filter: result.filter,
      timestamp: new Date().toISOString(),
    }, targetRooms);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Revenue overview retrieved successfully',
    data: result,
  });
});

export const DashboardController = {
  getLeaderboard,
  getRevenueOverview,
};
