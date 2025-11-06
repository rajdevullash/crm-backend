/* eslint-disable @typescript-eslint/no-explicit-any */
// Define your interfaces here

import mongoose, { Model } from 'mongoose';
export type Note = {
  text: string;
  addedBy: mongoose.Types.ObjectId;

  date: string;
}

export type ILead = {
  title: string;                  
  name: string;                    
  email?: string;
  phone?: string;
  order?: number;
  source?: string;                 
  stage?: mongoose.Types.ObjectId;              
  assignedTo?: mongoose.Types.ObjectId;        
  createdBy?: mongoose.Types.ObjectId;   
  budget?: number;
  currency?: string;
  attachment?: {
    _doc: any;
    id: any;
    _id: any;
    url: string;               
    originalName: string;
    type: string; 
    size?: number;
  }[] | null;        
  notes?: Note[];
  quickNote?: string; // Persistent quick note field
  followUpDate?: string | null;
  activities?: any[];
  
  // Deal closing fields
  dealStatus?: 'open' | 'lost' | 'closing_requested' | 'closed';
  lostReason?: string;
  dealRejectionReason?: string; // Reason for deal close request rejection
  closingRequestedAt?: Date;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  
  history?: {
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    changedBy: mongoose.Types.ObjectId;
    timestamp: Date;
    description?: string;
  }[];
  _id?: any;
  updatedAt?: any;
  createdAt?: any;
};
export type LeadModel = Model<ILead, Record<string, unknown>>;

export type ILeadFilters = {
  searchTerm?: string;
  source?: string;
  stage?: string;
  assignedTo?: string;
  createdBy?: string;
  minBudget?: string;
  maxBudget?: string;
};
