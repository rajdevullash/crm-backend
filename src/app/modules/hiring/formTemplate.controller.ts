/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { FormTemplate } from './formTemplate.model';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

// Create a new form template
export const createFormTemplate = catchAsync(async (req: Request, res: Response) => {
  const formTemplate = await FormTemplate.create(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Form template created',
    data: formTemplate,
  });
});

// Get all form templates
export const getFormTemplates = catchAsync(async (req: Request, res: Response) => {
  const templates = await FormTemplate.find();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Form templates fetched',
    data: templates,
  });
});

// Get form template by jobId
export const getFormTemplateByJob = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  console.log("Fetching template for jobId:", jobId);
  const template = await FormTemplate.findOne({ jobId });
  console.log("Template found:", template);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Form template fetched',
    data: template,
  });
});

// Update form template
export const updateFormTemplate = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  console.log("=== Update Form Template ===");
  console.log("Template ID:", id);
  console.log("Request body:", req.body);
  
  // Handle jobId removal (set to null/undefined)
  const updateData: any = { ...req.body };
  let updateQuery: any = {};
  
  if (updateData.jobId === null || updateData.jobId === undefined || updateData.jobId === '') {
    // Remove jobId field using $unset
    console.log("Removing jobId from template");
    updateQuery = { $unset: { jobId: '' } };
    // Also update other fields if any
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    const { jobId, ...otherFields } = updateData;
    if (Object.keys(otherFields).length > 0) {
      updateQuery = { ...updateQuery, ...otherFields };
    }
  } else {
    // Set jobId
    console.log("Setting jobId to:", updateData.jobId);
    updateQuery = updateData;
  }
  
  console.log("Update query:", JSON.stringify(updateQuery, null, 2));
  
  const updated = await FormTemplate.findByIdAndUpdate(
    id, 
    updateQuery, 
    { new: true }
  );
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Form template updated',
    data: updated,
  });
});

// Delete form template
export const deleteFormTemplate = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await FormTemplate.findByIdAndDelete(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Form template deleted',
  });
});
