import mongoose, { Model } from 'mongoose';

export type IDealCloseRequest = {
  lead: mongoose.Types.ObjectId;
  representative: mongoose.Types.ObjectId;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  incentiveAmount?: number; // Amount in BDT
  incentiveCurrency?: string; // Always 'BDT' for incentive payment
  notes?: string;
  previousStage?: mongoose.Types.ObjectId; // Stage the lead was in before requesting to close
  _id?: any;
  createdAt?: any;
  updatedAt?: any;
};

export type DealCloseRequestModel = Model<IDealCloseRequest, Record<string, unknown>>;

export type IDealCloseRequestFilters = {
  searchTerm?: string;
  status?: string;
  representative?: string;
};
