
// Define your model here
import { Schema, model } from 'mongoose';
import { IStage, StageModel } from './stage.interface';

const stageSchema = new Schema<IStage, StageModel>(
  {
    title: { type: String, required: true },
    position: { type: Number},
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);



// hook to auto increament the position field
stageSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastStage = await Stage.findOne().sort({ position: -1 });
    this.position = lastStage ? lastStage.position + 1 : 1;
  }
  next();
});

// hook to update the position of other stages when a stage is deleted
stageSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  const deletedPosition = this.position;
  await Stage.updateMany(
    { position: { $gt: deletedPosition } },
    { $inc: { position: -1 } },
  );
  next();
});

export const Stage = model<IStage, StageModel>('Stage', stageSchema);