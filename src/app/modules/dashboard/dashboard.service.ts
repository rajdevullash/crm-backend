/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { User } from "../auth/auth.model";
import { Lead } from "../lead/lead.model";
import { Stage } from "../stage/stage.model";
import { Task } from "../task/task.model";
import mongoose from "mongoose";

// Get representative's task data for the past year (monthly basis)
const getRepresentativeTaskData = async (userId: string) => {
  // Calculate date range (last 12 months from current date)
  const currentDate = new Date();
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

  const taskData = await Task.aggregate([
    // Match tasks assigned to the specific user within date range
    {
      $match: {
        assignTo: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    
    // Add month and year fields
    {
      $addFields: {
        month: { $month: "$createdAt" },
        year: { $year: "$createdAt" },
      },
    },
    
    // Group by year and month
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
        },
        totalTasks: { $sum: 1 },
        pending: {
          $sum: {
            $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
          },
        },
        completed: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
          },
        },
        cancelled: {
          $sum: {
            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
          },
        },
      },
    },
    
    // Sort by year and month ascending (oldest to newest)
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
    
    // Project final fields
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        monthName: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id.month", 1] }, then: "January" },
              { case: { $eq: ["$_id.month", 2] }, then: "February" },
              { case: { $eq: ["$_id.month", 3] }, then: "March" },
              { case: { $eq: ["$_id.month", 4] }, then: "April" },
              { case: { $eq: ["$_id.month", 5] }, then: "May" },
              { case: { $eq: ["$_id.month", 6] }, then: "June" },
              { case: { $eq: ["$_id.month", 7] }, then: "July" },
              { case: { $eq: ["$_id.month", 8] }, then: "August" },
              { case: { $eq: ["$_id.month", 9] }, then: "September" },
              { case: { $eq: ["$_id.month", 10] }, then: "October" },
              { case: { $eq: ["$_id.month", 11] }, then: "November" },
              { case: { $eq: ["$_id.month", 12] }, then: "December" },
            ],
            default: "Unknown",
          },
        },
        totalTasks: 1,
        pending: 1,
        completed: 1,
        cancelled: 1,
      },
    },
  ]);

  // Calculate summary
  const summary = {
    totalTasks: taskData.reduce((sum, month) => sum + month.totalTasks, 0),
    totalPending: taskData.reduce((sum, month) => sum + month.pending, 0),
    totalCompleted: taskData.reduce((sum, month) => sum + month.completed, 0),
    totalCancelled: taskData.reduce((sum, month) => sum + month.cancelled, 0),
  };

  return {
    type: 'representative_tasks',
    summary,
    monthlyData: taskData,
    dateRange: {
      startDate,
      endDate,
    },
  };
};

const getLeaderboard = async (userId?: string, userRole?: string) => {
  console.log('📊 Fetching leaderboard...');
  
  const leaderboard = await User.aggregate([
    // Only include active users (optional - remove if you want all users)
    {
      $match: {
        role: { $in: ["representative"] }
      }
    },
    
    // Lookup leads assigned to user
    {
      $lookup: {
        from: "leads",
        localField: "_id",
        foreignField: "assignedTo",
        as: "assignedLeads",
      },
    },
    
    // 🏆 Lookup APPROVED close requests - THIS IS THE SOURCE OF TRUTH
    // Only count deals where admin has approved the close request
    {
      $lookup: {
        from: "dealcloserequests",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$representative", "$$userId"] },
                  { $eq: ["$status", "approved"] }
                ]
              }
            }
          }
        ],
        as: "approvedCloseRequests",
      },
    },
    
    // Lookup tasks assigned to user
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "assignTo",
        as: "tasks",
      },
    },
    
    // Add computed fields - Stage 1
    {
      $addFields: {
        // Count ACTUAL assigned leads (not the cached field)
        totalLeads: { 
          $cond: {
            if: { $isArray: "$assignedLeads" },
            then: { $size: "$assignedLeads" },
            else: 0
          }
        },
        
        // 🏆 COUNT CONVERTED LEADS FROM APPROVED CLOSE REQUESTS
        // This is the PRIMARY ranking metric - counts only deals with status='approved'
        convertedLeadsCount: { 
          $cond: {
            if: { $isArray: "$approvedCloseRequests" },
            then: { $size: "$approvedCloseRequests" },
            else: 0
          }
        },
        
        // Get IDs of approved leads for filtering
        approvedLeadIds: {
          $map: {
            input: { $ifNull: ["$approvedCloseRequests", []] },
            as: "req",
            in: "$$req.lead"
          }
        },
      },
    },
    
    // Add computed fields - Stage 2 (using approvedLeadIds from Stage 1)
    {
      $addFields: {
        // Get IDs of leads that are NOT converted
        nonConvertedLeadIds: {
          $filter: {
            input: "$assignedLeads",
            as: "lead",
            cond: { 
              $not: { 
                $in: ["$$lead._id", { $ifNull: ["$approvedLeadIds", []] }] 
              } 
            },
          },
        },
      },
    },
    
    // Extract just the IDs from non-converted leads
    {
      $addFields: {
        nonConvertedLeadIdList: {
          $map: {
            input: "$nonConvertedLeadIds",
            as: "lead",
            in: "$$lead._id"
          }
        }
      }
    },
    
    // Count ALL completed tasks (for additional stats)
    {
      $addFields: {
        // Total completed tasks across ALL leads (converted or not)
        completedTasksCount: {
          $size: {
            $filter: {
              input: "$tasks",
              as: "task",
              cond: { $eq: ["$$task.status", "completed"] }
            },
          },
        },
        
        // For backward compatibility / detailed stats
        nonConvertedTasksCount: {
          $size: {
            $filter: {
              input: "$tasks",
              as: "task",
              cond: {
                $and: [
                  { $eq: ["$$task.status", "completed"] },
                  { $in: ["$$task.lead", "$nonConvertedLeadIdList"] },
                ],
              },
            },
          },
        },
      },
    },
    
    // Project final fields - ONLY CONVERTED LEADS COUNT
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        role: 1,
        profileImage: 1,
        totalLeads: 1,
        convertedLeadsCount: 1, // ONLY METRIC SHOWN - jar joto beshi sha toto upore
        completedTasksCount: 1, // Keep for display only
      },
    },
    
    // 🏆 SORT BY CONVERTED LEADS COUNT (Highest first)
    // The more converted leads, the higher the rank
    { $sort: { convertedLeadsCount: -1, totalPoints: -1 } },
  ]);

  console.log('📊 Leaderboard results:');
  
  // Get detailed info for debugging
  const detailedLeaderboard = await User.aggregate([
    {
      $match: {
        role: { $in: ["representative"] }
      }
    },
    {
      $lookup: {
        from: "leads",
        localField: "_id",
        foreignField: "assignedTo",
        as: "assignedLeads",
      },
    },
    {
      $lookup: {
        from: "dealcloserequests",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$representative", "$$userId"] }
            }
          },
          {
            $lookup: {
              from: "leads",
              localField: "lead",
              foreignField: "_id",
              as: "leadDetails"
            }
          },
          {
            $unwind: { path: "$leadDetails", preserveNullAndEmptyArrays: true }
          }
        ],
        as: "allCloseRequests",
      },
    },
    {
      $project: {
        name: 1,
        totalAssignedLeads: { $size: "$assignedLeads" },
        allCloseRequests: {
          lead: 1,
          status: 1,
          leadDetails: {
            title: 1,
            dealStatus: 1,
          }
        }
      }
    }
  ]);
  
  detailedLeaderboard.forEach((user, index) => {
    console.log(`\n  📊 ${index + 1}. ${user.name}:`);
    console.log(`     - Total Assigned Leads: ${user.totalAssignedLeads || 0}`);
    console.log(`     - All Close Requests (${user.allCloseRequests?.length || 0}):`);
    
    const approved = user.allCloseRequests?.filter((req: any) => req.status === 'approved') || [];
    const pending = user.allCloseRequests?.filter((req: any) => req.status === 'pending') || [];
    const rejected = user.allCloseRequests?.filter((req: any) => req.status === 'rejected') || [];
    

  });
  
  leaderboard.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.name}:`);
    console.log(`     - Total Leads: ${user.totalLeads}`);
    console.log(`     - Converted Leads (dealStatus='closed'): ${user.convertedLeadsCount}`);
  });

  return leaderboard;
};

// Revenue Overview with Monthly/Yearly Filters
const getRevenueOverview = async (year?: number, month?: number, userId?: string, userRole?: string) => {

  if (userRole === 'representative' && userId) {
    return getRepresentativeTaskData(userId);
  }
  // Get the last stage (converted stage) - assuming last position is converted
  const lastStage = await Stage.findOne().sort({ position: -1 });
  
  if (!lastStage) {
    return {
      summary: {
        totalRevenue: 0,
        totalConvertedLeads: 0,
        averageDealValue: 0,
      },
      monthlyData: [],
      filter: { year, month },
    };
  }

  // Build date filter based on year and month
  const currentYear = new Date().getFullYear();
  const targetYear = year || currentYear;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dateFilter: any = {};
  
  if (month) {
    // If month is provided, filter by specific month and year
    const startDate = new Date(targetYear, month - 1, 1);
    const endDate = new Date(targetYear, month, 0, 23, 59, 59, 999);
    dateFilter.updatedAt = { $gte: startDate, $lte: endDate };
  } else {
    // If only year is provided (or default), filter by entire year
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    dateFilter.updatedAt = { $gte: startDate, $lte: endDate };
  }

  // Aggregation pipeline for revenue overview
  const revenueData = await Lead.aggregate([
    // Match only converted leads in the specified time period
    {
      $match: {
        stage: lastStage._id,
        ...dateFilter,
      },
    },
    
    // Add month and year fields for grouping
    {
      $addFields: {
        month: { $month: "$updatedAt" },
        year: { $year: "$updatedAt" },
        budget: { $ifNull: ["$budget", 0] }, // Default budget to 0 if not set
      },
    },
    
    // Group by year and month
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
        },
        totalRevenue: { $sum: "$budget" },
        convertedLeadsCount: { $sum: 1 },
        leads: {
          $push: {
            _id: "$_id",
            title: "$title",
            name: "$name",
            email: "$email",
            phone: "$phone",
            budget: "$budget",
            convertedDate: "$updatedAt",
            assignedTo: "$assignedTo",
            createdBy: "$createdBy",
          },
        },
      },
    },
    
    // Calculate average deal value
    {
      $addFields: {
        averageDealValue: {
          $round: [
            {
              $cond: {
                if: { $gt: ["$convertedLeadsCount", 0] },
                then: { $divide: ["$totalRevenue", "$convertedLeadsCount"] },
                else: 0,
              },
            },
            2,
          ],
        },
      },
    },
    
    // Sort by year and month descending
    {
      $sort: {
        "_id.year": -1,
        "_id.month": -1,
      },
    },
    
    // Project final fields
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        monthName: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id.month", 1] }, then: "January" },
              { case: { $eq: ["$_id.month", 2] }, then: "February" },
              { case: { $eq: ["$_id.month", 3] }, then: "March" },
              { case: { $eq: ["$_id.month", 4] }, then: "April" },
              { case: { $eq: ["$_id.month", 5] }, then: "May" },
              { case: { $eq: ["$_id.month", 6] }, then: "June" },
              { case: { $eq: ["$_id.month", 7] }, then: "July" },
              { case: { $eq: ["$_id.month", 8] }, then: "August" },
              { case: { $eq: ["$_id.month", 9] }, then: "September" },
              { case: { $eq: ["$_id.month", 10] }, then: "October" },
              { case: { $eq: ["$_id.month", 11] }, then: "November" },
              { case: { $eq: ["$_id.month", 12] }, then: "December" },
            ],
            default: "Unknown",
          },
        },
        totalRevenue: 1,
        convertedLeadsCount: 1,
        averageDealValue: 1,
        leads: 1,
      },
    },
  ]);

  // Calculate summary totals
  const summary = {
    totalRevenue: revenueData.reduce((sum, month) => sum + month.totalRevenue, 0),
    totalConvertedLeads: revenueData.reduce((sum, month) => sum + month.convertedLeadsCount, 0),
    averageDealValue: 0,
  };

  summary.averageDealValue = summary.totalConvertedLeads > 0 
    ? Math.round((summary.totalRevenue / summary.totalConvertedLeads) * 100) / 100 
    : 0;

  return {
    summary,
    monthlyData: revenueData,
    filter: {
      year: targetYear,
      month: month || null,
      filterType: month ? 'monthly' : 'yearly',
    },
  };
};

export const DashboardService = {
  getLeaderboard,
  getRevenueOverview,
};