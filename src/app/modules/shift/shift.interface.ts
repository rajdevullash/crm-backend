import { Model } from 'mongoose';

export interface IShift {
  name: string;
  startTime: string;
  endTime: string;
  workDays?: string[];
}

export type ShiftModel = Model<IShift>;
