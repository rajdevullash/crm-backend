import { Schema, model } from 'mongoose';

export interface IActivityRead {
  userId: Schema.Types.ObjectId;
  activityId: string; // Format: leadId_historyId
  readAt: Date;
}

const activityReadSchema = new Schema<IActivityRead>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    activityId: {
      type: String,
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
activityReadSchema.index({ userId: 1, activityId: 1 }, { unique: true });
activityReadSchema.index({ userId: 1 });

export const ActivityRead = model<IActivityRead>('ActivityRead', activityReadSchema);
