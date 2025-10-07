
// Define your model here
import { Schema, model } from 'mongoose';
import { ILead } from './lead.interface';


const leadSchema = new Schema<ILead>(
  {
    title: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
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


