import fs from 'fs';
import multer from 'multer';
import path from 'path';

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/leads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter (allow images and PDFs)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    // Image types
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    
    // PDF
    'application/pdf',
    
    // XSL/XML
    'application/xsl+xml',
    'text/xsl',
    'application/xml',
    'text/xml',
    
    // Word documents
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // Excel spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    // OpenDocument formats (used by LibreOffice/OpenOffice)
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    
    // Plain text
    'text/plain',
    
    // Rich Text Format
    'application/rtf',
    'text/rtf',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files are allowed!'), false);
  }
};

// Multer instance (allow multiple attachments and custom activity attachments)
export const uploadLeadAttachments = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
}).fields([
  { name: 'attachment', maxCount: 10 }, // Regular attachments
  { name: 'customActivityAttachment', maxCount: 1 }, // Custom activity attachment
]);
