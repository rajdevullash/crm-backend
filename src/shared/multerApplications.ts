import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Express } from 'express';

// Ensure the upload folders exist
const resumeFolder = path.join(__dirname, '../../uploads/resumes');
const coverLetterFolder = path.join(__dirname, '../../uploads/coverLetters');

if (!fs.existsSync(resumeFolder)) {
  fs.mkdirSync(resumeFolder, { recursive: true });
}

if (!fs.existsSync(coverLetterFolder)) {
  fs.mkdirSync(coverLetterFolder, { recursive: true });
}

// Storage configuration for resumes
export const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resumeFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${ext}`);
  },
});

// Storage configuration for cover letters
export const coverLetterStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coverLetterFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `cover-letter-${uniqueSuffix}${ext}`);
  },
});

// File filter for resumes (PDF, DOC, DOCX)
export const resumeFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only PDF, DOC, and DOCX files are allowed for resumes'));
  }
  cb(null, true);
};

// File filter for cover letters (PDF, DOC, DOCX, TXT)
export const coverLetterFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed for cover letters'));
  }
  cb(null, true);
};

// Combined storage for both files
export const applicationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'resume') {
      cb(null, resumeFolder);
    } else if (file.fieldname === 'coverLetter') {
      cb(null, coverLetterFolder);
    } else {
      cb(new Error('Invalid field name'), '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'resume' ? 'resume' : 'cover-letter';
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

// Combined file filter
export const applicationFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'));
  }
  cb(null, true);
};

// Multer upload middleware for applications
export const uploadApplicationFiles = multer({
  storage: applicationStorage,
  fileFilter: applicationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
}).fields([
  { name: 'resume', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 },
]);

// Single file upload for resume only
export const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('resume');

// Single file upload for cover letter only
export const uploadCoverLetter = multer({
  storage: coverLetterStorage,
  fileFilter: coverLetterFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('coverLetter');
