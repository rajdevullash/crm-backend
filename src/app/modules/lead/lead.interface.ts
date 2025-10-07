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
  email: string;
  phone: string;
  source?: string;                 
  stage: mongoose.Types.ObjectId;              
  assignedTo?: mongoose.Types.ObjectId;        
  createdBy?: mongoose.Types.ObjectId;   
  budget?: number;
  attachment?: {
    url: string;               
    originalName: string;
    type: string; 
    size?: number;
  }[] | null;        
  notes?: Note[];                                   
  followUpDate?: string | null;
};
export type LeadModel = Model<ILead, Record<string, unknown>>;

export type ILeadFilters = {
  searchTerm?: string;
};
