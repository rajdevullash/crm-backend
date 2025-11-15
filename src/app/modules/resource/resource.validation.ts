import { z } from 'zod';

const addressSchema = z.object({
  street: z.string({ required_error: 'Street is required' }),
  city: z.string({ required_error: 'City is required' }),
  zipCode: z.string({ required_error: 'Zip code is required' }),
  country: z.string().default('Bangladesh'),
});

const bankDetailsSchema = z.object({
  name: z.string({ required_error: 'Bank name is required' }),
  accountNumber: z.string({ required_error: 'Account number is required' }),
  routingNumber: z.string({ required_error: 'Routing number is required' }),
});

const emergencyContactSchema = z.object({
  name: z.string({ required_error: 'Emergency contact name is required' }),
  phone: z.string({ required_error: 'Emergency contact phone is required' }),
  relation: z.string({ required_error: 'Relation is required' }),
});

const createResourceZodSchema = z.object({
  body: z.object({
    // Personal Information
    name: z.string({ required_error: 'Name is required' }),
    employeeId: z.string().optional(), // Will be generated if not provided
    nid: z.string().optional(), // Will use default if not provided
    phone: z.string({ required_error: 'Phone is required' }),
    secondaryPhone: z.string().optional(),
    email: z.string({ required_error: 'Email is required' }).email(),
    secondaryEmail: z.string().email().optional().or(z.literal('')),
    presentAddress: addressSchema.optional(), // Will use defaults if not provided
    permanentAddress: addressSchema.optional(), // Will use defaults if not provided
    
    // Job Information
    joiningDate: z.string({ required_error: 'Joining date is required' }).transform((str) => new Date(str)),
    workMode: z.enum(['on-site', 'remote'], { required_error: 'Work mode is required' }),
    jobType: z.enum(['permanent', 'internship'], { required_error: 'Job type is required' }),
    jobStatus: z.enum(['confirmed', 'probation', 'resigned']).default('probation'),
    position: z.string({ required_error: 'Position is required' }),
    department: z.string({ required_error: 'Department is required' }),
    salary: z.union([z.number().min(0), z.literal(0), z.undefined()]).optional().default(0),
    
    // Bank Details
    bankDetails: bankDetailsSchema.optional(), // Will use defaults if not provided
    
    // Emergency Contact
    emergencyContact: emergencyContactSchema.optional(), // Will use defaults if not provided
    
    // Optional fields
    applicationId: z.string().optional(),
  }),
});

const updateResourceZodSchema = z.object({
  body: z.object({
    // Personal Information
    name: z.string().optional(),
    employeeId: z.string().optional(),
    nid: z.string().optional(),
    phone: z.string().optional(),
    secondaryPhone: z.string().optional(),
    email: z.string().email().optional(),
    secondaryEmail: z.string().email().optional().or(z.literal('')),
    presentAddress: addressSchema.optional(),
    permanentAddress: addressSchema.optional(),
    
    // Job Information
    joiningDate: z.string().transform((str) => new Date(str)).optional(),
    workMode: z.enum(['on-site', 'remote']).optional(),
    jobType: z.enum(['permanent', 'internship']).optional(),
    jobStatus: z.enum(['confirmed', 'probation', 'resigned']).optional(),
    position: z.string().optional(),
    department: z.string().optional(),
    salary: z.union([z.number().min(0), z.literal(0)]).optional(),
    changeReason: z.string().optional(), // Reason for change (for history tracking)
    
    // Bank Details
    bankDetails: bankDetailsSchema.optional(),
    
    // Emergency Contact
    emergencyContact: emergencyContactSchema.optional(),
  }),
});

export const ResourceValidation = {
  createResourceZodSchema,
  updateResourceZodSchema,
};

