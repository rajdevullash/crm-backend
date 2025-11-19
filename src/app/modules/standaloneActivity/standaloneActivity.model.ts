import { Schema, model } from 'mongoose';

export type IStandaloneActivity = {
  type: 'call' | 'meeting' | 'email' | 'custom';
  date: Date;
  addedBy: Schema.Types.ObjectId;
  
  // Completion fields (for all activity types)
  completed: boolean;
  completedAt?: Date;
  completedBy?: Schema.Types.ObjectId;
  feedback?: string;
  markedAsOverdue: boolean;
  
  // Call specific fields
  callNote?: string;
  
  // Meeting specific fields
  meetingType?: 'online' | 'offline';
  meetingLink?: string;
  meetingLocation?: string;
  meetingDate?: Date;
  meetingOutcome?: string;
  meetingAttendees?: string;
  
  // Email specific fields
  emailNote?: string;
  
  // Custom activity fields
  customAttachment?: string; // File path/URL
  customNote?: string;
}

const standaloneActivitySchema = new Schema<IStandaloneActivity>(
  {
    type: {
      type: String,
      enum: ['call', 'meeting', 'email', 'custom'],
      required: true
    },
    date: { type: Date, default: Date.now, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Completion fields
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    feedback: { type: String },
    markedAsOverdue: { type: Boolean, default: false },
    
    // Call specific fields
    callNote: { type: String },
    
    // Meeting specific fields
    meetingType: { type: String, enum: ['online', 'offline'] },
    meetingLink: { type: String },
    meetingLocation: { type: String },
    meetingDate: { type: Date },
    meetingOutcome: { type: String },
    meetingAttendees: { type: String },
    
    // Email specific fields
    emailNote: { type: String },
    
    // Custom activity fields
    customAttachment: { type: String },
    customNote: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
standaloneActivitySchema.index({ addedBy: 1, date: -1 });
standaloneActivitySchema.index({ date: -1 });
standaloneActivitySchema.index({ completed: 1, date: -1 });

export const StandaloneActivity = model<IStandaloneActivity>('StandaloneActivity', standaloneActivitySchema);

