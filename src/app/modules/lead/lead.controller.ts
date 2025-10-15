/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Your controller code here

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import ApiError from '../../../errors/ApiError';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { leadFilterableFields } from './lead.constant';
import { ILead } from './lead.interface';
import { LeadService } from './lead.service';
import { Express } from 'express';
import { emitTaskEvent } from '../socket/socketService';
import { createLeadNotification } from '../../../app/helpers/notificationHelper';
import { sendLeadAssignmentEmail } from '../../../shared/emailService';
import { User } from '../auth/auth.model';

const createLead = catchAsync(async (req: Request, res: Response) => {

  // Uploaded files (from multer middleware)
  const files = req.files as Express.Multer.File[];

  const attachments =
    files && files.length > 0
      ? files.map(file => ({
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
    if (typeof notes === 'string') {
      formattedNotes = [
        { text: notes, addedBy: requestedUser, date: new Date() },
      ];
    } else {
      try {
        formattedNotes = (JSON.parse(notes) || []).map((note: any) => ({
          ...note,
          addedBy: requestedUser,
          date: new Date(),
        }));
      } catch {
        console.warn('Invalid notes JSON format');
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
  // Emit socket event for lead creation
  if (result) {
    console.log('New Lead Created:', result);

    // Prepare lead data to send in the notification
    const leadData = {
      _id: result._id,
      name: result.name,
      email: result.email,
      phone: result.phone,
      source: result.source,
      createdBy: result.createdBy,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    // Determine who should receive this notification
    const targetRooms = [
      `user_${requestedUser}`, // The creator
      `role_admin`, // All admins
      `role_super_admin`,
    ];

    // If lead is assigned to someone, add them to the recipients
    if (result.assignedTo) {
      targetRooms.push(`user_${result.assignedTo}`);
    }

    emitTaskEvent(
      'lead:created',
      {
        message: `New lead "${result.name}" added`,
        lead: leadData,
        user: {
          id: req.user?.userId,
          name: req.user?.name,
          role: req.user?.role,
        },
        timestamp: new Date().toISOString(),
      },
      targetRooms,
    );

    // Create notification (this will emit socket event 'notification:new' automatically)
    await createLeadNotification({
      _id: result._id.toString(),
      title: result.title,
      name: result.name,
      assignedTo: result.assignedTo?.toString(),
      createdBy: requestedUser,
    });

    // Send email to assigned user if lead is assigned to someone
    if (result.assignedTo && result.assignedTo.toString() !== requestedUser) {
      try {
        const assignedUser = await User.findById(result.assignedTo).select('name email');
        const creator = await User.findById(requestedUser).select('name');
        
        if (assignedUser && creator) {
          await sendLeadAssignmentEmail({
            assignedToEmail: assignedUser.email,
            assignedToName: assignedUser.name,
            assignedByName: creator.name,
            leadTitle: result.title,
            leadName: result.name,
            email: result.email,
            phone: result.phone,
            source: result.source,
            budget: result.budget,
          });
        }
      } catch (error) {
        console.error('Error sending lead assignment email:', error);
        // Continue execution even if email fails
      }
    }
  }

  sendResponse<ILead>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Lead created successfully',
    data: result,
  });
});

//get all lead

const getAllLeads = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, leadFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const role = req.user?.role;
  const userId = req.user?.userId;
  const result = await LeadService.getAllLeads(
    filters,
    paginationOptions,
    role,
    userId,
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

  // Get the existing lead to preserve notes and attachments if not provided
  const existingLead = await LeadService.getSpecificLead(id);
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  // New attachments (if any)
  const newAttachments =
    files && files.length > 0
      ? files.map(file => ({
          url: `/uploads/leads/${file.filename}`,
          originalName: file.originalname,
          type: file.mimetype,
          size: file.size,
        }))
      : [];

  // Parse existing attachments from frontend
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
  const { notes, deleteNoteId } = req.body;
  // ✅ Handle notes - Add new note to existing notes
  let formattedNotes: {
    _doc: any;
    id?: any;
    _id?: any;
    text: string;
    addedBy: any;
    date: Date;
  }[] = [];

  formattedNotes = (existingLead.notes || []).map((note: any) => ({
    ...note,
    date: note.date instanceof Date ? note.date : new Date(note.date),
  }));

  if (deleteNoteId) {
    // Remove quotes from the deleteNoteId if present
    const cleanDeleteNoteId = deleteNoteId.replace(/^"|"$/g, '');
    console.log('Deleting note with ID:', cleanDeleteNoteId);
    console.log('Original deleteNoteId:', deleteNoteId);

    // Filter out the note with the matching ID
    formattedNotes = formattedNotes.filter(note => {
      let noteId;

      // ✅ Try multiple possible locations for _id or id
      if (note._id) {
        noteId = note._id.toString();
      } else if (note.id) {
        noteId = note.id.toString();
      } else if (note._doc && note._doc._id) {
        // ✅ handle Mongoose subdocument
        noteId = note._doc._id.toString();
      }
      return noteId !== cleanDeleteNoteId;
    });
  } else if (notes !== undefined && notes !== null && notes !== '') {
    if (typeof notes === 'string') {
      const newNote = {
        _doc: {},
        text: notes.trim(),
        addedBy: requestedUser,
        date: new Date(),
      };

      // Add the new note to the existing notes
      formattedNotes.push(newNote);
    } else {
      try {
        formattedNotes = (JSON.parse(notes) || []).map((note: any) => ({
          ...note,
          addedBy: requestedUser,
          date: new Date(),
        }));
      } catch {
        console.warn('Invalid notes JSON format');
      }
    }
  } else {
    // If no notes provided, keep the existing notes
    formattedNotes = (existingLead.notes || []).map((note: any) => ({
      ...note,
      addedBy: note.addedBy?.toString ? note.addedBy.toString() : note.addedBy,
    }));
  }

  // ✅ Merge existing attachments safely
  let finalAttachments: any[] = [];
  const { attachmentIdToDelete } = req.body;
  if (attachmentIdToDelete) {
    const cleanAttachmentIdToDelete = attachmentIdToDelete.replace(
      /^"|"$/g,
      '',
    );
    console.log('Deleting attachment with ID:', cleanAttachmentIdToDelete);

    // Filter directly from existingLead.attachment instead of existingAttachments
    existingLead.attachment = (existingLead.attachment || []).filter(
      attachment => {
        let attachmentId;

        if (attachment._id) attachmentId = attachment._id.toString();
        else if (attachment.id) attachmentId = attachment.id.toString();
        else if (attachment._doc?._id)
          attachmentId = attachment._doc._id.toString();

        return attachmentId !== cleanAttachmentIdToDelete;
      },
    );
  }

  if (attachmentIdToDelete) {
    // Already filtered above
    finalAttachments = [...(existingLead.attachment ?? []), ...newAttachments];
  } else if (existingAttachments.length > 0 || newAttachments.length > 0) {
    finalAttachments = [...(existingLead.attachment ?? []), ...newAttachments];
  } else {
    finalAttachments = existingLead.attachment || [];
  }

  // Handle activities - Add new activity to existing activities
  let formattedActivities: any[] = [];

  formattedActivities = (existingLead.activities || []).map(
    (activity: any) => ({
      ...activity,
      date:
        activity.date instanceof Date ? activity.date : new Date(activity.date),
    }),
  );

  // Add new activity
  if (req.body.addActivity) {
    try {
      const newActivity = JSON.parse(req.body.addActivity);
      newActivity.addedBy = requestedUser;
      newActivity.date = new Date(newActivity.date);

      formattedActivities.push(newActivity);
      console.log('Added new activity:', newActivity);
    } catch (error) {
      console.error('Error parsing addActivity:', error);
    }
  }

  // Update existing activity
  if (req.body.updateActivity) {
    console.log('Updating activity with data:', req.body.updateActivity);
    try {
      const updatedActivity = JSON.parse(req.body.updateActivity);
      const activityIndex = formattedActivities.findIndex(activity => {
        let activityId;
        
        if (activity._id) activityId = activity._id.toString();
        else if (activity.id) activityId = activity.id.toString();
        else if (activity._doc?._id) activityId = activity._doc._id.toString();
        
        return activityId === updatedActivity.id;
      });

      if (activityIndex !== -1) {
        // Get the existing activity's _id
        const existingId = formattedActivities[activityIndex]._doc?._id || 
                          formattedActivities[activityIndex]._id;
        
        const existingAddedBy = formattedActivities[activityIndex]._doc?.addedBy || 
                                formattedActivities[activityIndex].addedBy || 
                                requestedUser;
        
        // Create clean activity object without the temporary 'id' field
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _tempId, ...activityUpdateData } = updatedActivity;
        
        // Update the activity with new data
        formattedActivities[activityIndex] = {
          ...activityUpdateData,
          _id: existingId,
          addedBy: existingAddedBy,
          date: new Date(updatedActivity.date),
        };
        console.log('Updated activity:', formattedActivities[activityIndex]);
      } else {
        console.log('Activity not found with ID:', updatedActivity.id);
      }
    } catch (error) {
      console.error('Error parsing updateActivity:', error);
    }
  }

  // Delete activity
  if (req.body.deleteActivityId) {
    const cleanDeleteActivityId = req.body.deleteActivityId.replace(
      /^"|"$/g,
      '',
    );
    console.log('Deleting activity with ID:', cleanDeleteActivityId);

    formattedActivities = formattedActivities.filter(activity => {
      let activityId;

      if (activity._id) activityId = activity._id.toString();
      else if (activity.id) activityId = activity.id.toString();
      else if (activity._doc?._id) activityId = activity._doc._id.toString();

      console.log('Checking activity ID:', activityId, 'against', cleanDeleteActivityId);
      return activityId !== cleanDeleteActivityId;
    });
    
    console.log('Activities after deletion:', formattedActivities.length);
  }

  console.log('Final activities to be saved:', formattedActivities);

  const data = {
    ...req.body,
    notes: formattedNotes,
    attachment: finalAttachments,
    activities: formattedActivities,
  };

  const result = await LeadService.updateLead(id, data);

  // Check if lead assignment changed and send email to newly assigned user
  const oldAssignedTo = existingLead?.assignedTo?.toString();
  const newAssignedTo = result?.assignedTo?.toString();

  if (result && newAssignedTo && oldAssignedTo !== newAssignedTo) {
    try {
      const assignedUser = await User.findById(newAssignedTo).select('name email');
      const updater = await User.findById(requestedUser).select('name');
      
      if (assignedUser && updater) {
        await sendLeadAssignmentEmail({
          assignedToEmail: assignedUser.email,
          assignedToName: assignedUser.name,
          assignedByName: updater.name,
          leadTitle: result.title,
          leadName: result.name,
          email: result.email,
          phone: result.phone,
          source: result.source,
          budget: result.budget,
        });
      }
    } catch (error) {
      console.error('Error sending lead assignment email:', error);
      // Continue execution even if email fails
    }
  }

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
  
  // Now delete the lead
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
