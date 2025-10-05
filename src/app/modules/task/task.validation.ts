
// Define your validations here
import { z } from 'zod';

const createTaskZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(1, 'Title is required'),
    description: z.string({ required_error: 'Description is required' }).min(1, 'Description is required'),
    lead: z.string({ required_error: 'Lead ID is required' }), // MongoDB ObjectId string
    assignTo: z.array(z.string()).optional().default([]), // multiple users
    status: z.string({ required_error: 'Status is required' }).min(1, 'Status is required'),
    dueDate: z
      .string({ required_error: 'Due date is required' })
      .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }),
    createdBy: z.string({ required_error: 'CreatedBy (User ID) is required' }),
    performancePoint: z.number().optional().default(0),
  }),
});


const updateTaskZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    lead: z.string().optional(),
    assignTo: z.array(z.string()).optional(),
    status: z.string().optional(),
    dueDate: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      })
      .optional(),
    createdBy: z.string().optional(),
    performancePoint: z.number().optional(),
  }),
});
export const TaskValidation = {
    createTaskZodSchema,
    updateTaskZodSchema,
    };