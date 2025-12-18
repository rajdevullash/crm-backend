import { z } from 'zod';

const createAttendanceZodSchema = z.object({
  body: z.object({
    employeeId: z.string({ required_error: 'Employee ID is required' }),
    date: z.string({ required_error: 'Date is required' }).optional(), // Defaults to today
    checkIn: z.string().optional(),
    status: z.array(z.string()).optional(),
    shift: z.string().optional(),
    workMode: z.enum(['On-site', 'Remote']).optional(),
    notes: z.string().optional(),
  }),
});

const updateAttendanceZodSchema = z.object({
  body: z.object({
    checkOut: z.string().optional(),
    status: z.array(z.string()).optional(),
    overtime: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const checkInZodSchema = z.object({
  body: z.object({
    employeeId: z.string({ required_error: 'Employee ID is required' }),
    workMode: z.enum(['On-site', 'Remote']).optional(),
    notes: z.string().optional(),
    checkInTime: z.string().optional(),
  }),
});

const checkOutZodSchema = z.object({
  body: z.object({
    employeeId: z.string({ required_error: 'Employee ID is required' }),
    notes: z.string().optional(),
    checkOutTime: z.string().optional(),
  }),
});

export const AttendanceValidation = {
  createAttendanceZodSchema,
  updateAttendanceZodSchema,
  checkInZodSchema,
  checkOutZodSchema,
};
