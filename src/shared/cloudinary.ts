/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import { v2 as cloudinary } from 'cloudinary';
import config from '../config';
import { CloudinaryUploadFile } from '../interfaces/cloudinaryUpload';

import { Request } from 'express';
import multer from 'multer';
import { z } from 'zod';
// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});
type MulterRequest = Request & { files: Express.Multer.File[] };

export const storage = multer.memoryStorage();

export const fileFilter = (
  req: MulterRequest,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) => {
  const maxFiles = 4;
  if (req.files.length > maxFiles) {
    console.log(req.files.length);
    // throw new Error(`Max files ${maxFiles}`);
    callback(
      new Error(`Number of ${maxFiles} files exceeds the limit`) as any,
      false,
    );
    // Indicate that there's an error, but pass null as the first argument
    // callback(null, false);
  } else {
    // Continue with the default behavior
    callback(null, true);
  }
};

export const cloudinaryUploadFileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  buffer: z.instanceof(Buffer),
  size: z.number(),
});

export const validateCloudinaryUploadFile = (
  file: CloudinaryUploadFile,
): void => {
  // Validate the file against the schema
  cloudinaryUploadFileSchema.parse(file);

  // Validate the file mimetype
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Only JPG, PNG, and WEBP are allowed.`);
  }
};
export const uploadToCloudinary = async (
  files: CloudinaryUploadFile[],
): Promise<{ public_id: string; secure_url: string }[]> => {
  // Validate each file before processing
  files.forEach(validateCloudinaryUploadFile);

  const uploadPromises = files.map(file => {
    return new Promise<{ public_id: string; secure_url: string }>(
      (resolve, reject) => {
        const upload_stream = cloudinary.uploader.upload_stream(
          { folder: 'main-images' },
          (error, result: any) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                public_id: result.public_id,
                secure_url: result.secure_url,
              });
            }
          },
        );

        upload_stream.end(file.buffer);
      },
    );
  });

  try {
    const uploadedFiles = await Promise.all(uploadPromises);
    return uploadedFiles;
  } catch (error) {
    throw new Error(
      `Failed to upload images to Cloudinary: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
};

export const deleteCloudinaryFiles = async (
  files: CloudinaryUploadFile[],
): Promise<void> => {
  const deletePromises = files.map(file => {
    if (!file.public_id) {
      // Skip files without public_id
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      // Use the Cloudinary API to delete the file by its public ID
      const publicId: string | undefined = file.public_id; // Allow undefined
      if (publicId === undefined) {
        // Skip files with undefined public_id
        return resolve();
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cloudinary.uploader.destroy(publicId, (error: any, result) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });

  try {
    await Promise.all(deletePromises);
  } catch (error: any) {
    throw new Error(`Error deleting Cloudinary files ${error}`);
  }
};

// ✅ File filter for PDFs
export const pdfFileFilter = (
  req: MulterRequest,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) => {
  const maxFiles = 5; // e.g., allow up to 5 PDFs
  if (req.files.length > maxFiles) {
    return callback(
      new Error(`Number of files exceeds the limit of ${maxFiles}`) as any,
      false,
    );
  }

  if (file.mimetype !== 'application/pdf') {
    return callback(new Error('Only PDF files are allowed') as any, false);
  }

  callback(null, true);
};

// ✅ Validation schema for PDF uploads
export const cloudinaryUploadPdfSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.literal('application/pdf'),
  buffer: z.instanceof(Buffer),
  size: z.number(),
});

export const validateCloudinaryUploadPdf = (
  file: CloudinaryUploadFile,
): void => {
  cloudinaryUploadPdfSchema.parse(file);

  if (file.mimetype !== 'application/pdf') {
    throw new Error('Invalid file type. Only PDF is allowed.');
  }
};

// ✅ Upload multiple PDFs to Cloudinary
export const uploadPdfsToCloudinary = async (
  files: CloudinaryUploadFile[],
): Promise<{ public_id: string; secure_url: string }[]> => {
  files.forEach(validateCloudinaryUploadPdf);

  const uploadPromises = files.map(file => {
    return new Promise<{ public_id: string; secure_url: string }>(
      (resolve, reject) => {
        const upload_stream = cloudinary.uploader.upload_stream(
          {
            folder: 'pdf-files',
            resource_type: 'raw',
          },
          (error, result: any) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                public_id: result.public_id,
                secure_url: result.secure_url,
              });
            }
          },
        );

        upload_stream.end(file.buffer);
      },
    );
  });

  try {
    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new Error(
      `Failed to upload PDFs to Cloudinary: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
};

// ✅ Delete PDFs from Cloudinary
export const deleteCloudinaryPdfs = async (
  files: CloudinaryUploadFile[],
): Promise<void> => {
  const deletePromises = files.map(file => {
    if (!file.public_id) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const publicId: string | undefined = file.public_id; // Allow undefined
      if (publicId === undefined) {
        // Skip files with undefined public_id
        return resolve();
      }
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'raw' },
        (error: any) => {
          if (error) reject(error);
          else resolve();
        },
      );
    });
  });

  try {
    await Promise.all(deletePromises);
  } catch (error: any) {
    throw new Error(`Error deleting Cloudinary PDFs: ${error.message}`);
  }
};
