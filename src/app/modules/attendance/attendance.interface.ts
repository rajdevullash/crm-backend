import { Model, Types } from 'mongoose';

export type AttendanceStatus = 'Present' | 'Late' | 'Half-day' | 'Absent' | 'On Leave' | 'Missing Punch' | 'Holiday' | 'Weekend';
export type WorkMode = 'On-site' | 'Remote';

export interface IAttendance {
  employeeId: string; // Reference to Resource employeeId
  resourceId: Types.ObjectId; // Reference to Resource _id
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: AttendanceStatus[];
  shift: string;
  workMode: WorkMode;
  overtime?: string; // e.g., "+2h 30m"
  totalHours?: string; // e.g., "8h 30m"
  lateBy?: string; // e.g., "15m"
  notes?: string;
  isModified?: boolean;
  modifiedBy?: string;
}

export type AttendanceModel = Model<IAttendance>;
