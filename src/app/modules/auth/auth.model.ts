import { Schema, model } from 'mongoose';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { IUser } from './auth.interface';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ENUM_USER_ROLE),
      default: ENUM_USER_ROLE.REPRESENTATIVE,
    },
    profileImage: { type: String, default: null },
    joinDate: { type: Date, default: Date.now },
    incentivePercentage: { type: Number, default: 0 }, // Incentive % for representatives
    performancePoint: { type: Number, default: 0 },
    totalLeads: { type: Number, default: 0 },
    convertedLeads: [
      { type: Schema.Types.ObjectId, ref: 'Lead' }
    ],
    tasksCompleted: { type: Number, default: 0 },

  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

export const User = model<IUser>('User', userSchema);
