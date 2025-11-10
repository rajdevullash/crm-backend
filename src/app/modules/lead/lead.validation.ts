
// Define your validations here

import { z } from "zod";


// -----------------------------
// Lead Schema
// -----------------------------
const createLeadValidationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  name: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  source: z.string().optional(),
  stage: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid stage ID")
    .optional()
    .or(z.literal("")),
  status: z.string().optional(),
  assignedTo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID")
    .optional()
    .or(z.literal("")),
  createdBy: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID")
    .optional(),
  budget: z.number().optional(),
  currency: z.enum(['BDT', 'USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD']).optional(),
  attachment: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const updateLeadValidationSchema = createLeadValidationSchema.partial().extend({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid lead ID"),
    });

export const LeadValidation = {
  createLeadValidationSchema,
  updateLeadValidationSchema,
};
