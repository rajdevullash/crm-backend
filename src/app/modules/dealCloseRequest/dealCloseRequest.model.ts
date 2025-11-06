import { Schema, model } from 'mongoose';
import { IDealCloseRequest } from './dealCloseRequest.interface';

const dealCloseRequestSchema = new Schema<IDealCloseRequest>(
  {
    lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    representative: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, default: Date.now, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    incentiveAmount: { type: Number }, // Amount in BDT
    incentiveCurrency: { type: String, default: 'BDT' }, // Always BDT for incentive payment
    notes: { type: String },
    previousStage: { type: Schema.Types.ObjectId, ref: 'Stage' }, // Stage the lead was in before requesting to close
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

export const DealCloseRequest = model<IDealCloseRequest>('DealCloseRequest', dealCloseRequestSchema);
