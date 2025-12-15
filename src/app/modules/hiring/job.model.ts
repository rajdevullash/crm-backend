import { Schema, model } from 'mongoose';
import { IJob } from './hiring.interface';

const jobSchema = new Schema<IJob>(
  {
    title: {
      type: String,
      trim: true,
      default: 'Untitled Job',
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    location: {
      type: String,
      trim: true,
      default: 'Remote',
    },
    type: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      default: 'Full-time',
    },
    salary: {
      type: String,
      default: 'Competitive',
    },
    salaryMin: {
      type: String,
    },
    salaryMax: {
      type: String,
    },
    salaryCurrency: {
      type: String,
      default: 'USD',
    },
    salaryPeriod: {
      type: String,
      default: '/ year',
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
    hiringManagers: [{
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
    }],
    postedDate: {
      type: Date,
      default: Date.now,
    },
    closedDate: {
      type: Date,
    },
    applicationDeadline: {
      type: Date,
    },
    applicantCount: {
      type: Number,
      default: 0,
    },
    autoReplyEmail: {
      type: Boolean,
      default: false,
    },
    autoReplyText: {
      type: String,
      default: '',
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
