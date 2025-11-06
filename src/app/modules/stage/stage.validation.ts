
// Define your validations here
import { z } from 'zod';

const createStageZodSchema = z.object({
    body: z.object({
        title: z.string({
            required_error: 'Title is required',
        }),
        isActive: z.boolean().optional(),
    }),
});

const updateStageZodSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        position: z.number().optional(),
        isActive: z.boolean().optional(),
        createdBy: z.string().optional(),
    }),
});

export const StageValidation = {
    createStageZodSchema,
    updateStageZodSchema,
};
