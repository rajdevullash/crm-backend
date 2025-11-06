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
import { emitTaskEvent, emitLeadEvent } from '../socket/socketService';
import { createLeadNotification } from '../../../app/helpers/notificationHelper';
import { sendLeadAssignmentEmail } from '../../../shared/emailService';
import { User } from '../auth/auth.model';

const createLead = catchAsync(async (req: Request, res: Response) => {

  // Uploaded files (from multer middleware) - now an object with field names as keys
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const attachmentFiles = files?.attachment || [];

  const attachments =
    attachmentFiles && attachmentFiles.length > 0
      ? attachmentFiles.map(file => ({
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
    // ✅ Convert empty strings to undefined so service can handle defaults properly
    stage: req.body.stage === '' || !req.body.stage ? undefined : req.body.stage,
    assignedTo: req.body.assignedTo === '' || !req.body.assignedTo ? undefined : req.body.assignedTo,
    email: req.body.email === '' ? undefined : req.body.email,
    phone: req.body.phone === '' ? undefined : req.body.phone,
    source: req.body.source === '' ? undefined : req.body.source,
    budget: req.body.budget === '' ? undefined : req.body.budget,
    currency: req.body.currency === '' ? undefined : req.body.currency,
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
    // Run in background (non-blocking)
    if (result.assignedTo && result.assignedTo.toString() !== requestedUser) {
      (async () => {
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
            console.log('✅ Lead assignment email sent in background');
          }
        } catch (error) {
          console.error('❌ Error sending lead assignment email:', error);
          // Email failure doesn't affect the API response
        }
      })();
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

  // Uploaded files - now an object with field names as keys
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const attachmentFiles = files?.attachment || [];
  const customActivityAttachmentFiles = files?.customActivityAttachment || [];

  // Get the existing lead to preserve notes and attachments if not provided
  const existingLead = await LeadService.getSpecificLead(id);
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  // New attachments (if any)
  const newAttachments =
    attachmentFiles && attachmentFiles.length > 0
      ? attachmentFiles.map(file => ({
          url: `/uploads/leads/${file.filename}`,
          originalName: file.originalname,
          type: file.mimetype,
          size: file.size,
        }))
      : [];

  // Process custom activity attachment (if any)
  let customActivityAttachmentUrl: string | undefined;
  if (customActivityAttachmentFiles && customActivityAttachmentFiles.length > 0) {
    const file = customActivityAttachmentFiles[0];
    customActivityAttachmentUrl = `/uploads/leads/${file.filename}`;
  }

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
      try {
        const parsedNotes = JSON.parse(notes);
        
        // Check if it's an array of notes (editing existing notes)
        if (Array.isArray(parsedNotes)) {
          formattedNotes = parsedNotes.map((note: any) => ({
            _doc: {},
            _id: note._id,
            text: note.text,
            addedBy: note.addedBy, // Preserve existing addedBy
            date: note.date instanceof Date ? note.date : new Date(note.date),
          }));
        } else {
          // Single string note (new note)
          const newNote = {
            _doc: {},
            text: notes.trim(),
            addedBy: requestedUser,
            date: new Date(),
          };
          formattedNotes.push(newNote);
        }
      } catch {
        // If JSON parse fails, it's a simple string (new note)
        const newNote = {
          _doc: {},
          text: notes.trim(),
          addedBy: requestedUser,
          date: new Date(),
        };
        formattedNotes.push(newNote);
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

      // Add custom activity attachment URL if uploaded
      if (customActivityAttachmentUrl && newActivity.type === 'custom') {
        newActivity.customAttachment = customActivityAttachmentUrl;
      }

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
        
        // Add custom activity attachment URL if uploaded (for updates)
        if (customActivityAttachmentUrl && updatedActivity.type === 'custom') {
          activityUpdateData.customAttachment = customActivityAttachmentUrl;
        }
        
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

  const result = await LeadService.updateLead(id, data, requestedUser);
  const userRole = req.user?.role;

  // Check if stage changed (lead moved)
  const oldStageId = existingLead?.stage?._id?.toString();
  const newStageId = result?.stage?._id?.toString() || result?.stage?.toString();
  
  if (result && oldStageId !== newStageId) {
    // Lead moved to different stage
    console.log('🎯 Lead moved to different stage, emitting socket event');
    
    // Always notify all admins, super admins, and representatives when a lead moves
    // This ensures admins see updates when representatives move leads
    const targetRooms = [
      'role_admin',
      'role_super_admin', 
      'role_representative',
    ];

    // Also notify the assigned representative specifically if lead is assigned
    const getAssignedToId = (assignedTo: any): string | null => {
      if (!assignedTo) return null;
      if (assignedTo._id) {
        return assignedTo._id.toString();
      }
      return assignedTo.toString();
    };

    const assignedToId = getAssignedToId(result.assignedTo);
    if (assignedToId) {
      targetRooms.push(`user_${assignedToId}`);
    }

    // Notify the creator as well
    const createdById = result.createdBy?._id 
      ? result.createdBy._id.toString() 
      : result.createdBy?.toString() || null;
    if (createdById) {
      targetRooms.push(`user_${createdById}`);
    }
    
    emitLeadEvent('leads:moved', {
      message: 'Lead moved to different stage',
      data: {
        leadId: id,
        oldStageId,
        newStageId,
        lead: result,
      },
      movedBy: {
        id: req.user?.userId,
        name: req.user?.name,
        role: req.user?.role,
      },
      timestamp: new Date().toISOString(),
    }, targetRooms);
  }

  // Check if lead assignment changed and send email to newly assigned user
  // Handle both populated and non-populated assignedTo
  // If populated, assignedTo is a user object with _id property
  // If not populated, assignedTo is just an ObjectId
  const getAssignedToId = (assignedTo: any): string | null => {
    if (!assignedTo) return null;
    // Check if it's populated (has _id property) or is an ObjectId
    if (assignedTo._id) {
      return assignedTo._id.toString();
    }
    // It's an ObjectId, convert to string
    return assignedTo.toString();
  };

  const oldAssignedToId = getAssignedToId(existingLead?.assignedTo);
  const newAssignedToId = getAssignedToId(result?.assignedTo);

  if (result && newAssignedToId && oldAssignedToId !== newAssignedToId) {
    // Send email in background (non-blocking)
    (async () => {
      try {
        const assignedUser = await User.findById(newAssignedToId).select('name email');
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
          console.log('✅ Lead reassignment email sent in background');
        }
      } catch (error) {
        console.error('❌ Error sending lead reassignment email:', error);
        // Email failure doesn't affect the API response
      }
    })();

    // Emit socket event for lead assignment change
      console.log('👤 Lead assignment changed, emitting socket event');
      console.log('   Old assignee:', oldAssignedToId);
      console.log('   New assignee:', newAssignedToId);
      
      const targetRooms = [
        `user_${newAssignedToId}`, // The newly assigned representative
        'role_admin', // All admins
        'role_super_admin',
      ];

      // If there was a previous assignee, notify them too
      if (oldAssignedToId && oldAssignedToId !== newAssignedToId) {
        targetRooms.push(`user_${oldAssignedToId}`);
      }

      // Prepare lead data for socket event
      const leadData = {
        _id: result._id,
        title: result.title,
        name: result.name,
        email: result.email,
        phone: result.phone,
        source: result.source,
        assignedTo: newAssignedToId,
        stage: result.stage,
        createdBy: result.createdBy,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      emitLeadEvent('lead:assigned', {
        message: `Lead "${result.name}" has been assigned`,
        lead: leadData,
        oldAssignedTo: oldAssignedToId,
        newAssignedTo: newAssignedToId,
        assignedBy: {
          id: req.user?.userId,
          name: req.user?.name,
          role: req.user?.role,
        },
        timestamp: new Date().toISOString(),
      }, targetRooms);
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
  
  // Get the lead before deleting to emit socket event
  const existingLead = await LeadService.getSpecificLead(id);
  
  // Now delete the lead
  await LeadService.deleteLead(id);
  
  // Emit socket event for lead deletion
  if (existingLead) {
    console.log('🗑️ Lead deleted, emitting socket event');
    
    const targetRooms = [
      'role_admin', // All admins
      'role_super_admin',
      'role_representative', // All representatives
    ];

    // If lead was assigned to someone, notify them specifically
    const getAssignedToId = (assignedTo: any): string | null => {
      if (!assignedTo) return null;
      if (assignedTo._id) {
        return assignedTo._id.toString();
      }
      return assignedTo.toString();
    };

    const assignedToId = getAssignedToId(existingLead.assignedTo);
    if (assignedToId) {
      targetRooms.push(`user_${assignedToId}`);
    }

    // If lead had a creator, notify them
    const createdById = existingLead.createdBy?._id 
      ? existingLead.createdBy._id.toString() 
      : existingLead.createdBy?.toString() || null;
    if (createdById) {
      targetRooms.push(`user_${createdById}`);
    }

    emitLeadEvent('lead:deleted', {
      message: `Lead "${existingLead.name}" has been deleted`,
      leadId: id,
      lead: {
        _id: existingLead._id,
        name: existingLead.name,
        title: existingLead.title,
      },
      deletedBy: {
        id: req.user?.userId,
        name: req.user?.name,
        role: req.user?.role,
      },
      timestamp: new Date().toISOString(),
    }, targetRooms);
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lead deleted successfully',
  });
});

// Reorder leads within a stage
const reorderLeads = catchAsync(async (req: Request, res: Response) => {
  const { leadOrders } = req.body; // Expecting array of { leadId, order }
  const userRole = req.user?.role;

  if (!leadOrders || !Array.isArray(leadOrders)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'leadOrders must be an array');
  }

  await LeadService.reorderLeads(leadOrders);

  // Emit socket event to notify all connected clients about lead reordering
  console.log('📋 Leads reordered, emitting socket event');
  
  // Target rooms based on user role
  const targetRooms = 
    userRole === 'representative' 
      ? ['role_representative']
      : ['role_admin', 'role_super_admin', 'role_representative'];
  
  emitLeadEvent('leads:reordered', {
    message: 'Leads reordered successfully',
    data: { leadOrders },
    timestamp: new Date().toISOString(),
  }, targetRooms);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Leads reordered successfully',
  });
});

// Get all activities from all leads (for global activity log)
const getAllActivities = catchAsync(async (req: Request, res: Response) => {
  const result = await LeadService.getAllActivities(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Activities retrieved successfully',
    data: result,
  });
});

// Get recent activity notifications from lead history
const getRecentActivityNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await LeadService.getRecentActivityNotifications(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Activity notifications retrieved successfully',
    data: result,
  });
});

// Mark a single activity as read
const markActivityAsRead = catchAsync(async (req: Request, res: Response) => {
  const { activityId } = req.body;
  const userId = req.user?.userId;
  
  const result = await LeadService.markActivityAsRead(userId, activityId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
  });
});

// Mark all activities as read
const markAllActivitiesAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;
  
  const result = await LeadService.markAllActivitiesAsRead(userId, role);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: { count: result.count },
  });
});

// Get unread activity count
const getUnreadActivityCount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;
  
  const count = await LeadService.getUnreadActivityCount(userId, role);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unread activity count retrieved successfully',
    data: { count },
  });
});

// Mark activity overdue notification as sent
const markActivityOverdueNotificationSent = catchAsync(async (req: Request, res: Response) => {
  const { leadId, historyId } = req.body;
  
  const result = await LeadService.markActivityOverdueNotificationSent(leadId, historyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
  });
});

// Get leads for Kanban board with pagination
const getKanbanLeads = catchAsync(async (req: Request, res: Response) => {
  const { stageId, skip = '0', limit = '5' } = req.query;
  const role = req.user?.role;
  const userId = req.user?.userId;
  
  const result = await LeadService.getKanbanLeads(
    stageId as string,
    parseInt(skip as string, 10),
    parseInt(limit as string, 10),
    role,
    userId
  );
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Kanban leads fetched successfully',
    data: result,
  });
});

export const LeadController = {
  createLead,
  getAllLeads,
  getSpecificLead,
  updateLead,
  deleteLead,
  reorderLeads,
  getAllActivities,
  getRecentActivityNotifications,
  markActivityAsRead,
  markAllActivitiesAsRead,
  getUnreadActivityCount,
  markActivityOverdueNotificationSent,
  getKanbanLeads,
};
