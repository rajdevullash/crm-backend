
// Define your validations here

import { z } from "zod";


// -----------------------------
// Lead Schema
// -----------------------------
const createLeadValidationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
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
  currency: z.enum(['BDT', 'USD', 'EUR']).optional(),
  attachment: z.array(z.string()).optional(),
  notes: z.string().optional(),
  followUpDate: z
    .preprocess(
      (val) =>
        typeof val === "string" ||
        typeof val === "number" ||
        val instanceof Date
          ? new Date(val)
          : undefined,
      z.date()
    )
    .optional(),
});

const updateLeadValidationSchema = createLeadValidationSchema.partial().extend({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid lead ID"),
    });

export const LeadValidation = {
  createLeadValidationSchema,
  updateLeadValidationSchema,
};
