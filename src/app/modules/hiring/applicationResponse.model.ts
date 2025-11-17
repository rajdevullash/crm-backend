import { Schema, model } from 'mongoose';

const applicationResponseSchema = new Schema({
  applicationId: { type: String, ref: 'Application', required: true },
  questionId: { type: String, required: true },
  answer: { type: Schema.Types.Mixed }, // string, array, file url, etc.
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

export const ApplicationResponse = model('ApplicationResponse', applicationResponseSchema);
