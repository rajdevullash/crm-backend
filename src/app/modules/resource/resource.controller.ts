/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ResourceService } from './resource.service';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';
import { resourceFilterableFields } from './resource.constant';

const createResource = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const resourceData = req.body;

  const result = await ResourceService.createResource(
    resourceData,
    user?.userId,
    user?.name,
    user?.role
  );

  // Determine message based on user creation status
  let message = 'Resource created successfully';
  const userCreated = (result as any).__userCreated;
  const userLinked = (result as any).__userLinked;
  
  if (userCreated) {
    message = 'Resource created successfully. User account has been created with default password (12345678).';
  } else if (userLinked) {
    message = 'Resource created successfully. Linked to existing user account.';
  } else if (!result.email || !result.name || !result.phone) {
    message = 'Resource created successfully. User account was not created due to missing information (email, name, or phone).';
  }

  // Remove internal flags from response
  delete (result as any).__userCreated;
  delete (result as any).__userLinked;

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message,
    data: result,
  });
});

const getAllResources = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, resourceFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await ResourceService.getAllResources(filters, paginationOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Resources retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSingleResource = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await ResourceService.getSingleResource(id);

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Resource not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Resource retrieved successfully',
    data: result,
  });
});

const updateResource = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const updateData = req.body;

  const result = await ResourceService.updateResource(
    id,
    updateData,
    user?.userId,
    user?.name,
    user?.role
  );

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Resource not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Resource updated successfully',
    data: result,
  });
});

const deleteResource = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await ResourceService.deleteResource(id);

  if (!result.resource) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Resource not found',
      data: null,
    });
  }

  // Determine message based on user deletion status
  let message = 'Resource deleted successfully';
  if (result.userDeleted) {
    message = 'Resource and associated user account deleted successfully';
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message,
    data: result.resource,
  });
});

const addAttachment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  
  // multer.single() puts file in req.file, not req.files
  // eslint-disable-next-line no-undef
  const file = req.file as Express.Multer.File;
  
  if (!file) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'No file uploaded',
      data: null,
    });
  }

  const attachmentUrl = `/uploads/resources/${file.filename}`;

  const attachment = {
    name: req.body.name || file.originalname || 'Attachment',
    url: attachmentUrl,
    documentType: req.body.documentType || 'Other',
  };

  const result = await ResourceService.addAttachment(
    id,
    attachment,
    user?.userId,
    user?.name,
    user?.role
  );

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Resource not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Attachment added successfully',
    data: result,
  });
});

const updateAttachment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { attachmentIndex, name, documentType } = req.body;

  if (attachmentIndex === undefined) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'Attachment index is required',
      data: null,
    });
  }

  const updateData: { name?: string; documentType?: string } = {};
  if (name !== undefined) updateData.name = name;
  if (documentType !== undefined) updateData.documentType = documentType;

  const result = await ResourceService.updateAttachment(id, attachmentIndex, updateData);

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Resource not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Attachment updated successfully',
    data: result,
  });
});

const removeAttachment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { attachmentIndex } = req.body;

  const result = await ResourceService.removeAttachment(id, attachmentIndex);

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Resource not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Attachment removed successfully',
    data: result,
  });
});

export const ResourceController = {
  createResource,
  getAllResources,
  getSingleResource,
  updateResource,
  deleteResource,
  addAttachment,
  updateAttachment,
  removeAttachment,
};

