import { Schema, model } from 'mongoose';

export const QUESTION_TYPES = ['text', 'multiple_choice', 'file'] as const;

const formQuestionSchema = new Schema({
  label: { type: String, required: true },
  type: { type: String, enum: QUESTION_TYPES, required: true },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // For multiple_choice
  order: { type: Number, default: 0 },
});

const formTemplateSchema = new Schema({
  jobId: { type: String, ref: 'Job', required: false }, // null for global template
  title: { type: String, required: true },
  questions: [formQuestionSchema],
  createdBy: {
    id: String,
    name: String,
    role: String,
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id;
      return ret;
    },
  },
});

export const FormTemplate = model('FormTemplate', formTemplateSchema);
