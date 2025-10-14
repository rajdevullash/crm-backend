import { User } from "../auth/auth.model";
import { Lead } from "../lead/lead.model";
import { Stage } from "../stage/stage.model";

const getLeaderboard = async () => {
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
    
    // Lookup tasks assigned to user
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "assignTo",
        as: "tasks",
      },
    },
    
    // Add computed fields
    {
      $addFields: {
        // Use the totalLeads field from User model (maintained by createLead/deleteLead)
        totalLeads: { $ifNull: ["$totalLeads", 0] },
        
        // Count of converted leads (array of ObjectIds)
        convertedLeadsCount: { 
          $cond: {
            if: { $isArray: "$convertedLeads" },
            then: { $size: "$convertedLeads" },
            else: 0
          }
        },
        
        // Get IDs of leads that are NOT converted
        nonConvertedLeadIds: {
          $filter: {
            input: "$assignedLeads",
            as: "lead",
            cond: { 
              $not: { 
                $in: ["$$lead._id", { $ifNull: ["$convertedLeads", []] }] 
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
    
    // Count ALL completed tasks (fair approach)
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
    
    // Calculate points (WEIGHTED SYSTEM: 80% tasks + 20% conversion = 100%)
    {
      $addFields: {
        // 🏆 WEIGHTED Scoring logic
        // Each lead worth 100 points total
        // - Tasks contribute 80 points (distributed across all tasks)
        // - Conversion adds final 20 points
        
        // Step 1: Calculate task points for ALL leads (80% of lead value)
        // We need to know tasks per lead, but aggregate doesn't have this info
        // So we use a simpler approach: 0.8 points per task
        completedTaskPoints: { 
          $round: [{ $multiply: ["$completedTasksCount", 0.8] }, 2]
        },
        
        // Step 2: Conversion bonus (20% of lead value = 20 points per conversion)
        convertedLeadPoints: { 
          $round: [{ $multiply: ["$convertedLeadsCount", 20] }, 2]
        },
        
        // Legacy field for backward compatibility
        nonConvertedTaskPoints: { 
          $round: [{ $multiply: ["$nonConvertedTasksCount", 0.8] }, 2]
        },
        
        // Total performance points
        // Formula: Base + (Tasks × 0.8) + (Conversions × 20)
        // Example: 10 tasks + 1 conversion = (10 × 0.8) + (1 × 20) = 8 + 20 = 28 pts
        totalPoints: {
          $round: [{
            $add: [
              { $ifNull: ["$performancePoint", 0] },
              { $multiply: ["$completedTasksCount", 0.8] },
              { $multiply: ["$convertedLeadsCount", 20] },
            ],
          }, 2]
        },
      },
    },
    
    // Project final fields
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        role: 1,
        profileImage: 1,
        totalLeads: 1,
        convertedLeadsCount: 1,
        completedTasksCount: 1,
        completedTaskPoints: 1, // New field for all task points
        nonConvertedTasksCount: 1, // For reference/stats
        nonConvertedTaskPoints: 1, // For backward compatibility
        performancePoint: { $ifNull: ["$performancePoint", 0] },
        convertedLeadPoints: 1,
        totalPoints: 1,
      },
    },
    
    // Sort by total points (highest first)
    { $sort: { totalPoints: -1 } },
  ]);

  return leaderboard;
};

// Revenue Overview with Monthly/Yearly Filters
const getRevenueOverview = async (year?: number, month?: number) => {
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