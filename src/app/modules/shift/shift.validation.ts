import { z } from 'zod';

const createShiftZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Shift name is required' }),
    startTime: z.string({ required_error: 'Start time is required' }),
    endTime: z.string({ required_error: 'End time is required' }),
    workDays: z.array(z.string()).optional(),
  }),
});

export const ShiftValidation = {
  createShiftZodSchema,
};
