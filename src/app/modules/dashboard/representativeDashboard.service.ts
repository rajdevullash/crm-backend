import mongoose from 'mongoose';
import { Lead } from '../lead/lead.model';
import { Stage } from '../stage/stage.model';
import { DealCloseRequest } from '../dealCloseRequest/dealCloseRequest.model';

/**
 * Get representative dashboard statistics
 * 1. Total Sales (total leads assigned)
 * 2. Converted Leads (leads in Won stage)
 * 3. Pipeline Value (sum of budgets in BDT, excluding Won and Lost stages)
 * 4. Incentive Amount (total earned incentive from approved close requests)
 * 5. Active Leads (count of leads excluding Won and Lost stages)
 */
const getRepresentativeDashboardStats = async (representativeId: string) => {
  const repId = new mongoose.Types.ObjectId(representativeId);
  
  // Get Won and Lost stage IDs
  const wonStage = await Stage.findOne({ 
    $or: [
      { title: { $regex: /^won$/i } },
      { title: { $regex: /won/i } }
    ]
  }).sort({ position: -1 });
  
  const lostStage = await Stage.findOne({ 
    $or: [
      { title: { $regex: /^lost$/i } },
      { title: { $regex: /lost/i } }
    ]
  });

  const wonStageId = wonStage?._id;
  const lostStageId = lostStage?._id;

  // Get all leads assigned to representative
  const allLeads = await Lead.find({ assignedTo: repId }).populate('stage');

  // 1. Total Sales (Total leads assigned)
  const totalSales = allLeads.length;

  // 2. Converted Leads (Leads with APPROVED close requests)
  // Only count leads where admin has approved the deal closing request
  const approvedCloseRequests = await DealCloseRequest.find({
    representative: repId,
    status: 'approved',
  }).select('lead');

  const approvedLeadIds = approvedCloseRequests.map(req => req.lead.toString());
  const convertedLeadsCount = approvedLeadIds.length;

  // 3 & 5. Pipeline Value and Active Leads (excluding Won and Lost stages)
  const activeLeads = allLeads.filter(lead => {
    const stageId = lead.stage?._id?.toString();
    return stageId !== wonStageId?.toString() && stageId !== lostStageId?.toString();
  });

  const activeLeadsCount = activeLeads.length;

  // Calculate pipeline value (convert all currencies to BDT)
  let pipelineValue = 0;
  
  // Exchange rates (same as currencyService)
  const exchangeRates: { [key: string]: number } = {
    'BDT': 1,
    'USD': 110,
    'EUR': 120,
    'GBP': 140,
    'INR': 1.32,
  };

  for (const lead of activeLeads) {
    const budget = lead.budget || 0;
    const currency = lead.currency || 'BDT';
    const rate = exchangeRates[currency.toUpperCase()] || 1;
    pipelineValue += budget * rate;
  }

  // Round to 2 decimal places
  pipelineValue = Math.round(pipelineValue * 100) / 100;

  // 4. Total Incentive Amount (from approved close requests)
  const approvedRequests = await DealCloseRequest.find({
    representative: repId,
    status: 'approved',
  });

  const totalIncentive = approvedRequests.reduce((sum, request) => {
    return sum + (request.incentiveAmount || 0);
  }, 0);

  return {
    totalSales,
    convertedLeads: convertedLeadsCount,
    pipelineValue,
    totalIncentive: Math.round(totalIncentive * 100) / 100,
    activeLeads: activeLeadsCount,
  };
};

export const RepresentativeDashboardService = {
  getRepresentativeDashboardStats,
};
