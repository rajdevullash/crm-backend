import { IStandaloneActivity } from './standaloneActivity.model';

export type IStandaloneActivityFilters = {
  addedBy?: string;
  type?: 'call' | 'meeting' | 'email' | 'custom';
  completed?: boolean;
  startDate?: Date;
  endDate?: Date;
};

export type ICreateStandaloneActivity = Omit<IStandaloneActivity, '_id' | 'createdAt' | 'updatedAt'>;

export type IUpdateStandaloneActivity = Partial<Omit<IStandaloneActivity, '_id' | 'createdAt' | 'updatedAt' | 'addedBy'>>;

