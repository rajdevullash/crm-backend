/* eslint-disable @typescript-eslint/no-explicit-any */

// Define your interfaces here
import mongoose, { Model } from 'mongoose';

export type ITask = {
  _id?: any;
  updatedAt?: any;
  createdAt?: any;
  title: string;
  description: string;
  lead: mongoose.Types.ObjectId;
  assignTo: mongoose.Types.ObjectId;
  status: string;
  dueDate: Date; // ISO date string (e.g. "2025-10-05T08:45:00.000Z")
  createdBy: mongoose.Types.ObjectId;
  performancePoint: number;
  priority?: string;
};

export type TaskModel = Model<ITask, Record<string, unknown>>;

export type ITaskFilters = {
  searchTerm?: string;
  lead?: mongoose.Types.ObjectId;
  assignTo?: mongoose.Types.ObjectId[];
  status?: string;
  dueDate?: string;
  createdBy?: mongoose.Types.ObjectId;
  performancePoint?: number;
};