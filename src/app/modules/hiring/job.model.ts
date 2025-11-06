import { Schema, model } from 'mongoose';
import { IJob } from './hiring.interface';

const jobSchema = new Schema<IJob>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      required: true,
    },
    salary: {
      type: String,
      required: true,
    },
    vacancy: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    description: {
      type: String,
    },
    extractedKeywords: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'draft'],
      default: 'active',
    },
    postedBy: {
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
    postedDate: {
      type: Date,
      default: Date.now,
    },
    closedDate: {
      type: Date,
    },
    applicantCount: {
      type: Number,
      default: 0,
    },
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
jobSchema.index({ title: 'text', department: 'text', location: 'text' });
jobSchema.index({ status: 1, postedDate: -1 });

export const Job = model<IJob>('Job', jobSchema);
