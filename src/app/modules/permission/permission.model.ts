import { Schema, model } from 'mongoose';
import { IPermission, IModule, IRolePermission, IRole, IUserPermission } from './permission.interface';
import { ENUM_MODULE, ENUM_PERMISSION } from './permission.interface';

// Permission Schema
const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: Object.values(ENUM_PERMISSION),
    },
    displayName: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
      enum: Object.values(ENUM_MODULE),
    },
    action: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Module Schema
const moduleSchema = new Schema<IModule>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: Object.values(ENUM_MODULE),
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Role Schema
const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Role Permission Schema
const rolePermissionSchema = new Schema<IRolePermission>(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// User Permission Schema (User-specific permissions)
const userPermissionSchema = new Schema<IUserPermission>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Indexes
permissionSchema.index({ module: 1, action: 1, resource: 1 });
rolePermissionSchema.index({ role: 1 });
roleSchema.index({ name: 1 });
userPermissionSchema.index({ userId: 1 });

export const Permission = model<IPermission>('Permission', permissionSchema);
export const Module = model<IModule>('Module', moduleSchema);
export const Role = model<IRole>('Role', roleSchema);
export const RolePermission = model<IRolePermission>('RolePermission', rolePermissionSchema);
export const UserPermission = model<IUserPermission>('UserPermission', userPermissionSchema);

