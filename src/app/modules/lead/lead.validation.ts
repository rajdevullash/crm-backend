
// Define your validations here

import { z } from "zod";


// -----------------------------
// Lead Schema
// -----------------------------
const createLeadValidationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number is required"),
  source: z.string().optional(),
  status: z.string().optional(),
  assignedTo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID")
    .optional(),
  createdBy: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID")
    .optional(),
  budget: z.number().optional(),
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
