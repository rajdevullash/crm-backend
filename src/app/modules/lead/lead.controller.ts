// Your controller code here

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { leadFilterableFields } from './lead.constant';
import { ILead } from './lead.interface';
import { LeadService } from './lead.service';
import { uploadLeadAttachments } from '../../../shared/uploadLeadAttachments';
import { Express } from 'express';

const createLead = catchAsync(async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadLeadAttachments(req, res, async (err: any) => {
  if (err) {
    return res.status(400).json({ message: err.message });
  }

  const files = req.files as Express.Multer.File[];
  const attachments =
    files && files.length > 0
      ? files.map((file) => ({
          url: `/uploads/leads/${file.filename}`,
          originalName: file.originalname,
          type: file.mimetype,
          size: file.size,
        }))
      : [];

  const data = {
    ...req.body,
    attachment: attachments,
  };

  const result = await LeadService.createLead(data);

  sendResponse<ILead>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Lead created successfully',
    data: result,
    });
  });
});

//get all lead

const getAllLeads = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, leadFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await LeadService.getAllLeads(
    filters,
    paginationOptions,
  );

  sendResponse<ILead[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Leads fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

//get specific lead

const getSpecificLead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeadService.getSpecificLead(id);
  sendResponse<ILead>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lead fetched successfully',
    data: result,
  });
});

//update lead

const updateLead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Use the same multer upload function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadLeadAttachments(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const files = req.files as Express.Multer.File[];

    // Map new uploads to attachment objects
    const newAttachments =
      files && files.length > 0
        ? files.map((file) => ({
            url: `/uploads/leads/${file.filename}`,
            originalName: file.originalname,
            type: file.mimetype,
            size: file.size,
          }))
        : [];

    // Parse any existing attachments sent as JSON (from frontend)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let existingAttachments: any[] = [];
    if (req.body.existingAttachments) {
      try {
        existingAttachments = JSON.parse(req.body.existingAttachments);
      } catch {
        console.warn('Invalid existingAttachments JSON format');
      }
    }

    // Combine existing + new attachments
    const finalAttachments = [...existingAttachments, ...newAttachments];

    // Build updated data
    const data = {
      ...req.body,
      attachment: finalAttachments,
    };

    const result = await LeadService.updateLead(id, data);

    sendResponse<ILead>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Lead updated successfully',
      data: result,
    });
  });
});

//delete lead

const deleteLead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await LeadService.deleteLead(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lead deleted successfully',
  });
});

export const LeadController = {
  createLead,
  getAllLeads,
  getSpecificLead,
  updateLead,
  deleteLead,
};