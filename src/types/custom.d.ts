/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { CloudinaryUploadFile } from '../interfaces/cloudinaryUpload';

// Ensure you replace with the correct path

declare global {
  namespace Express {
    interface Request {
      files?: {
        image?: CloudinaryUploadFile[];
      };
    }
  }
}
