import { Schema, model } from 'mongoose';
import { IAttendance, AttendanceModel } from './attendance.interface';

const attendanceSchema = new Schema<IAttendance, AttendanceModel>(
  {
    employeeId: { type: String, required: true, trim: true },
    resourceId: { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: { 
      type: [String], 
      enum: ['Present', 'Late', 'Half-day', 'Absent', 'On Leave', 'Missing Punch', 'Holiday', 'Weekend'],
      default: ['Absent'] 
    },
    shift: { type: String, default: '09:00 - 18:00' },
    workMode: { type: String, enum: ['On-site', 'Remote'], default: 'On-site' },
    overtime: { type: String },
    totalHours: { type: String },
    lateBy: { type: String },
    notes: { type: String },
    isModified: { type: Boolean, default: false },
    modifiedBy: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Indexes
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true }); // One attendance record per employee per day
attendanceSchema.index({ resourceId: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

export const Attendance = model<IAttendance, AttendanceModel>('Attendance', attendanceSchema);
