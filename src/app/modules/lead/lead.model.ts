
// Define your model here
import { Schema, model } from 'mongoose';
import { ILead } from './lead.interface';


const leadSchema = new Schema<ILead>(
  {
    title: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    source: { type: String },
    stage: { type: Schema.Types.ObjectId, ref: 'Stage' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    budget: { type: Number },
    attachment: [
        {
        url: { type: String, required: true },
        originalName: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number },
        }
    ],
    notes: [
      {
        text: { type: String, required: true },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, default: Date.now },
      },
    ],
    activities: [
      {
        type: {
          type: String,
          enum: ['call', 'meeting', 'mail', 'task', 'note'],
          required: true
        },
        date: { type: Date, default: Date.now, required: true },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        notes: { type: String },
        
        // Call specific fields
        phoneNumber: { type: String },
        callDuration: { type: Number }, // in minutes
        callOutcome: { type: String, enum: ['answered', 'missed', 'voicemail', 'callback'] },
        
        // Meeting specific fields
        meetingLink: { type: String },
        meetingLocation: { type: String },
        meetingDate: { type: Date },
        meetingOutcome: { type: String },
        
        // Mail specific fields
        emailSubject: { type: String },
        emailBody: { type: String },
        emailTo: { type: String },
        emailFrom: { type: String },
        emailStatus: { type: String, enum: ['sent', 'received', 'draft', 'bounced'] },
        
        // Task specific fields
        taskTitle: { type: String },
        taskDescription: { type: String },
        taskDueDate: { type: Date },
        taskStatus: { type: String, enum: ['pending', 'in-progress', 'completed'] },
        
        // Note specific fields
        noteContent: { type: String },
      }
    ],
    followUpDate: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

export const Lead = model<ILead>('Lead', leadSchema);


