
// Define your model here

import { model, Schema } from "mongoose";
import { ITask } from "./task.interface";


const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    assignTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, required: true },
    dueDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performancePoint: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

export const Task = model<ITask>('Task', taskSchema);