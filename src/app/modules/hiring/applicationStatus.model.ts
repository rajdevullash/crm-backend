import { Schema, model } from 'mongoose';
import { IApplicationStatus } from './applicationStatus.interface';

const applicationStatusSchema = new Schema<IApplicationStatus>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
      default: '#6b7280', // Default gray color
    },
    department: {
      type: String,
      trim: true,
      default: null, // null means global status
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Index for better query performance
applicationStatusSchema.index({ department: 1, isActive: 1, order: 1 });
applicationStatusSchema.index({ isDefault: 1 });

// Ensure unique status name per department (or global)
applicationStatusSchema.index({ name: 1, department: 1 }, { unique: true });

export const ApplicationStatus = model<IApplicationStatus>('ApplicationStatus', applicationStatusSchema);

