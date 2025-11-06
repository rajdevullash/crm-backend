
// Define your model here
import { Schema, model } from 'mongoose';
import { ILead } from './lead.interface';


const leadSchema = new Schema<ILead>(
  {
    title: { type: String, required: true },
    name: { type: String },
    email: { type: String },
    phone: { type: String, required: true },
    source: { type: String },
    stage: { type: Schema.Types.ObjectId, ref: 'Stage' },
    order: { type: Number, default: 0 }, // Order within the stage
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    budget: { type: Number },
    currency: { 
      type: String, 
      enum: ['BDT', 'USD', 'EUR'],
      default: 'USD'
    },
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
    quickNote: { type: String, default: '' }, // Persistent quick note field for representatives
    activities: [
      {
        type: {
          type: String,
          enum: ['call', 'meeting', 'email', 'custom'],
          required: true
        },
        date: { type: Date, default: Date.now, required: true },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        
        // Completion fields (for all activity types)
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        feedback: { type: String },
        markedAsOverdue: { type: Boolean, default: false }, // Track if overdue was logged
        
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
        
        // Custom activity fields (formerly Task)
        customAttachment: { type: String }, // File path/URL
        customNote: { type: String },
      }
    ],
    
    // Deal closing fields
    dealStatus: { 
      type: String, 
      enum: ['open', 'lost', 'closing_requested', 'closed'],
      default: 'open'
    },
    lostReason: { type: String },
    dealRejectionReason: { type: String }, // Reason for deal close request rejection
    closingRequestedAt: { type: Date },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    
    history: [
      {
        action: { type: String, required: true }, // 'created', 'stage_changed', 'assigned', 'updated'
        field: { type: String }, // Which field was changed
        oldValue: { type: String },
        newValue: { type: String },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        timestamp: { type: Date, default: Date.now, required: true },
        description: { type: String }, // Human-readable description
        overdueNotificationSent: { type: Boolean, default: false }, // Track if overdue notification was shown
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


