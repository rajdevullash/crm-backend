import { Schema, model } from 'mongoose';
import { IResource, WorkMode, JobType, JobStatus } from './resource.interface';

const addressSchema = new Schema(
  {
    street: { type: String, required: true, trim: true, default: 'To be updated' },
    city: { type: String, required: true, trim: true, default: 'To be updated' },
    zipCode: { type: String, required: true, trim: true, default: '0000' },
    country: { type: String, required: true, trim: true, default: 'Bangladesh' },
  },
  { _id: false }
);

const bankDetailsSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, default: 'To be updated' },
    accountNumber: { type: String, required: true, trim: true, default: 'To be updated' },
    routingNumber: { type: String, required: true, trim: true, default: 'To be updated' },
  },
  { _id: false }
);

const emergencyContactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, default: 'To be updated' },
    phone: { type: String, required: true, trim: true, default: 'To be updated' },
    relation: { type: String, required: true, trim: true, default: 'To be updated' },
  },
  { _id: false }
);

const jobHistorySchema = new Schema(
  {
    workMode: { type: String, enum: ['on-site', 'remote'], required: true },
    jobType: { type: String, enum: ['permanent', 'internship'], required: true },
    jobStatus: { type: String, enum: ['confirmed', 'probation', 'resigned'], required: true },
    position: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    salary: { type: Number, required: true },
    changedAt: { type: Date, required: true, default: Date.now },
    changedBy: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
    changeReason: { type: String, trim: true },
  },
  { _id: false, timestamps: false }
);

const salaryHistorySchema = new Schema(
  {
    salary: { type: Number, required: true },
    percentageChange: { type: Number },
    changedAt: { type: Date, required: true, default: Date.now },
    changedBy: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
    changeReason: { type: String, trim: true },
  },
  { _id: false, timestamps: false }
);

const positionHistorySchema = new Schema(
  {
    position: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    changedAt: { type: Date, required: true, default: Date.now },
    changedBy: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
    changeReason: { type: String, trim: true },
  },
  { _id: false, timestamps: false }
);

const attachmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
  },
  { _id: false }
);

const resourceSchema = new Schema<IResource>(
  {
    // Personal Information
    name: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    nid: { type: String, required: true, trim: true, default: 'To be updated' },
    phone: { type: String, required: true, trim: true },
    secondaryPhone: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    secondaryEmail: { type: String, trim: true, lowercase: true },
    presentAddress: { type: addressSchema, required: true },
    permanentAddress: { type: addressSchema, required: true },
    
    // Job Information
    joiningDate: { type: Date, required: true },
    workMode: { type: String, enum: ['on-site', 'remote'], required: true },
    jobType: { type: String, enum: ['permanent', 'internship'], required: true },
    jobStatus: { type: String, enum: ['confirmed', 'probation', 'resigned'], required: true, default: 'probation' },
    position: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    salary: { type: Number, required: true },
    
    // History Tracking
    jobHistory: { type: [jobHistorySchema], default: [] },
    salaryHistory: { type: [salaryHistorySchema], default: [] },
    positionHistory: { type: [positionHistorySchema], default: [] },
    
    // Bank Details
    bankDetails: { type: bankDetailsSchema, required: true },
    
    // Emergency Contact
    emergencyContact: { type: emergencyContactSchema, required: true },
    
    // Attachments
    attachments: { type: [attachmentSchema], default: [] },
    
    // References
    userId: { type: String, trim: true },
    applicationId: { type: String, trim: true },
    
    // Metadata
    createdBy: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
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

// Indexes for better query performance
resourceSchema.index({ employeeId: 1 });
resourceSchema.index({ email: 1 });
resourceSchema.index({ phone: 1 });
resourceSchema.index({ department: 1 });
resourceSchema.index({ position: 1 });
resourceSchema.index({ jobStatus: 1 });
resourceSchema.index({ userId: 1 });
resourceSchema.index({ applicationId: 1 });
resourceSchema.index({ name: 'text', email: 'text', employeeId: 'text' });

export const Resource = model<IResource>('Resource', resourceSchema);

