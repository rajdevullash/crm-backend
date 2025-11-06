import { Schema, model } from 'mongoose';
import { IApplication } from './hiring.interface';

const applicationSchema = new Schema<IApplication>(
  {
    jobId: {
      type: String,
      required: true,
      ref: 'Job',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    resumeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    coverLetter: {
      type: String,
      trim: true,
    },
    atsScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    extractedKeywords: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired', 'called', 'meeting-scheduled', 'task-assigned', 'submitted', 'meeting-done'],
      default: 'pending',
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      id: String,
      name: String,
      role: String,
    },
    reviewedDate: {
      type: Date,
    },
    notes: [
      {
        text: {
          type: String,
          required: true,
        },
        addedBy: {
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
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

// Index for better query performance
applicationSchema.index({ jobId: 1, atsScore: -1 });
applicationSchema.index({ email: 1 });
applicationSchema.index({ status: 1, appliedDate: -1 });

export const Application = model<IApplication>('Application', applicationSchema);
