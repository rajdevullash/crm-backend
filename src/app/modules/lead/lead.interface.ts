// Define your interfaces here

import mongoose, { Model } from 'mongoose';
export type Note = {
  text: string;
  addedBy: mongoose.Types.ObjectId;
  // ISO date string (e.g. "2025-10-05T08:45:00.000Z")
  date: string;
}

export type ILead = {
  title: string;                   // "E-commerce Website Development"
  name: string;                    // contact name
  email: string;
  phone: string;
  source?: string;                 // e.g. "Facebook"
  status?: string;                 // e.g. "In Progress"
  assignedTo?: mongoose.Types.ObjectId;           // user who is assigned
  createdBy?: mongoose.Types.ObjectId;            // user who created the record
  budget?: number;                 // numeric budget
  attachment?: {
    url: string; // File path or cloud URL
    originalName: string;
    type: string; // MIME type (e.g., image/png, application/pdf)
    size?: number;
  }[] | null;        // file reference or null
  notes?: Note[];                                   // array of notes
  followUpDate?: string | null;
                          // creation date
};
export type LeadModel = Model<ILead, Record<string, unknown>>;

export type ILeadFilters = {
  searchTerm?: string;
};
