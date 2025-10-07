// Define your interfaces here

import mongoose, { Model } from 'mongoose';

export type IStage = {
  order: number;
  title: string;
  position: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
};
export type StageModel = Model<IStage, Record<string, unknown>>;

export type IStageFilters = {
  searchTerm?: string;
};

