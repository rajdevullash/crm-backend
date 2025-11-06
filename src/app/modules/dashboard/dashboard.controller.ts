import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DashboardService } from './dashboard.service';
import { RepresentativeDashboardService } from './representativeDashboard.service';
import { emitDashboardEvent } from '../socket/socketService';

const getLeaderboard = catchAsync(async (req: Request, res: Response) => {
  // Get user info from authenticated request
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  const result = await DashboardService.getLeaderboard(userId, userRole);

  // Emit socket event to notify all connected clients about leaderboard update
  if (result) {
    console.log('📊 Leaderboard/Task data fetched, emitting socket event');
    
    // Target rooms based on user role
    const targetRooms = 
      userRole === 'representative' 
        ? ['role_representative']
        : ['role_admin', 'role_super_admin', 'role_representative'];

    const eventType = userRole === 'representative' ? 'tasks:updated' : 'leaderboard:updated';
    
    emitDashboardEvent(eventType, {
      message: userRole === 'representative' 
        ? 'Task data updated' 
        : 'Leaderboard data updated',
      data: result,
      timestamp: new Date().toISOString(),
    }, targetRooms);
  }

  const message = userRole === 'representative' 
    ? 'Task data retrieved successfully' 
    : 'Leaderboard retrieved successfully';

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result,
  });
});

const getRevenueOverview = catchAsync(async (req: Request, res: Response) => {
  const { year, month } = req.query;

  const userId = req.user?.userId;
  const userRole = req.user?.role;

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

  const result = await DashboardService.getRevenueOverview(yearNum, monthNum, userId, userRole);

  // Emit socket event for revenue overview updates
  if (result) {
    console.log('💰 Revenue overview fetched, emitting socket event');
    
    const targetRooms = [
      'role_admin',
      'role_super_admin',
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      message: 'Revenue overview data updated',
      summary: result.summary,
      timestamp: new Date().toISOString(),
    };

    if ('filter' in result && result.filter !== undefined) {
      payload.filter = result.filter;
    }

    emitDashboardEvent('revenue:updated', payload, targetRooms);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Revenue overview retrieved successfully',
    data: result,
  });
});

const getRepresentativeStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: 'User not authenticated',
      data: null,
    });
  }

  const result = await RepresentativeDashboardService.getRepresentativeDashboardStats(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Representative dashboard statistics retrieved successfully',
    data: result,
  });
});

export const DashboardController = {
  getLeaderboard,
  getRevenueOverview,
  getRepresentativeStats,
};
