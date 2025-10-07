
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
import { Express } from 'express';

export const createLead = catchAsync(async (req: Request, res: Response) => {
  console.log("Request Body:", req.body);

  // Uploaded files (from multer middleware)
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

  // ✅ Extract authenticated user from token middleware
  const requestedUser = req.user?.userId;

  // ✅ Handle notes safely
  const { notes } = req.body;
  let formattedNotes: { text: string; addedBy: string; date: Date }[] = [];
  if (notes) {
    if (typeof notes === "string") {
      formattedNotes = [
        { text: notes, addedBy: requestedUser, date: new Date() },
      ];
  } else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formattedNotes = (JSON.parse(notes) || []).map((note: any) => ({
        ...note,
        addedBy: requestedUser,
        date: new Date(),
      }));
      } catch {
        console.warn("Invalid notes JSON format");
      }
    }
  }


  // ✅ Prepare final data object
  const data = {
    ...req.body,
    attachment: attachments,
    createdBy: requestedUser,
    notes: formattedNotes,
  };

  // ✅ Create lead
  const result = await LeadService.createLead(data);

  sendResponse<ILead>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Lead created successfully",
    data: result,
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
  console.log('Updating lead with Body:', req.body);

  const files = req.files as Express.Multer.File[];

  // New attachments (if any)
  const newAttachments =
    files && files.length > 0
      ? files.map((file) => ({
          url: `/uploads/leads/${file.filename}`,
          originalName: file.originalname,
          type: file.mimetype,
          size: file.size,
        }))
      : [];

  // Parse existing attachments from frontend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let existingAttachments: any[] = [];
  if (req.body.existingAttachments) {
    try {
      existingAttachments = JSON.parse(req.body.existingAttachments);
    } catch {
      console.warn('Invalid existingAttachments JSON format');
    }
  }

  // ✅ Extract authenticated user from token middleware
  const requestedUser = req.user?.userId;

  // ✅ Handle notes safely
  const { notes } = req.body;
  let formattedNotes: { text: string; addedBy: string; date: Date }[] = [];
  if (notes) {
    if (typeof notes === "string") {
      formattedNotes = [
        { text: notes, addedBy: requestedUser, date: new Date() },
      ];
  } else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formattedNotes = (JSON.parse(notes) || []).map((note: any) => ({
        ...note,
        addedBy: requestedUser,
        date: new Date(),
      }));
      } catch {
        console.warn("Invalid notes JSON format");
      }
    }
  }

  // Combine both
  const finalAttachments = [...existingAttachments, ...newAttachments];

  const data = {
    ...req.body,
    notes: formattedNotes,
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