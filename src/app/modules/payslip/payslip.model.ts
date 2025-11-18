import { Schema, model } from 'mongoose';
import { IPayslip } from './payslip.interface';

const allowanceSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const deductionSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const payslipSchema = new Schema<IPayslip>(
  {
    resourceId: {
      type: String,
      required: true,
      ref: 'Resource',
    },
    employeeId: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    baseSalary: {
      type: Number,
      required: true,
    },
    allowances: {
      type: [allowanceSchema],
      default: [],
    },
    deductions: {
      type: [deductionSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    generatedBy: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
payslipSchema.index({ resourceId: 1, month: 1, year: 1 });
payslipSchema.index({ employeeId: 1 });

export const Payslip = model<IPayslip>('Payslip', payslipSchema);

