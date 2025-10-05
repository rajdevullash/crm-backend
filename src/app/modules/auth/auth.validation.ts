import { z } from 'zod';
import { ENUM_USER_ROLE } from '../../../enums/user';

const createUserZodSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }),
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email(),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(6),
    phone: z.string({
      required_error: 'Phone number is required',
    }).min(5, 'Phone number is required'),
    role: z
      .enum(Object.values(ENUM_USER_ROLE) as [string, ...string[]], {
        required_error: 'Role is required',
      })
      .optional(),
    profileImage: z.array(z.record(z.any())).optional().nullable(),

  }),
});

const loginZodSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email(),
    password: z.string({
      required_error: 'Password is required',
    }),
  }),
});

const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z
      .string()
      .email()
      .optional(),
    password: z
      .string()
      .min(6)
      .optional(),
    phone: z.string().min(5, 'Phone number is required').optional(),
    role: z
      .enum(Object.values(ENUM_USER_ROLE) as [string, ...string[]])
      .optional(),
    profileImage: z.array(z.record(z.any())).optional().nullable(),
  }),
});

export const AuthValidation = {
  createUserZodSchema,
  loginZodSchema,
  updateUserZodSchema,
};
