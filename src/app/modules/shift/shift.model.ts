import { Schema, model } from 'mongoose';
import { IShift, ShiftModel } from './shift.interface';

const shiftSchema = new Schema<IShift, ShiftModel>(
  {
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    workDays: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

export const Shift = model<IShift, ShiftModel>('Shift', shiftSchema);
