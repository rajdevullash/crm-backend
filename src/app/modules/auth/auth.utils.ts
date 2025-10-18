import multer from 'multer';
import { fileFilter, storage } from '../../../shared/cloudinary';

export const configureImagesUpload = () =>
  multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 1024 * 1024 * 10,
      files: 1, // Adjust the limit for the number of files to 2
    },
  }).fields([{ name: 'profileImage', maxCount: 1 }]);
