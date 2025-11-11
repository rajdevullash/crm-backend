import mongoose, { Schema, model } from 'mongoose';

export interface IActivityBadge {
  userId: mongoose.Types.ObjectId;
  date: string; // Format: YYYY-MM-DD (date only, no time)
  viewed: boolean; // Whether user has viewed/clicked the activity menu
  lastViewedAt?: Date; // Timestamp when user last viewed
  count?: number; // Number of activities for this date (cached)
}

const activityBadgeSchema = new Schema<IActivityBadge>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    viewed: {
      type: Boolean,
      default: false,
    },
    lastViewedAt: {
      type: Date,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one record per user per date
activityBadgeSchema.index({ userId: 1, date: 1 }, { unique: true });
activityBadgeSchema.index({ userId: 1 });
activityBadgeSchema.index({ date: 1 });

export const ActivityBadge = model<IActivityBadge>('ActivityBadge', activityBadgeSchema);

