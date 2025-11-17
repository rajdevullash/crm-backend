import { Request, Response } from 'express';
import { ApplicationResponse } from './applicationResponse.model';
import { Application } from './application.model';
import { Job } from './job.model';
import { FormTemplate } from './formTemplate.model';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multer configuration for dynamic file fields
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadFolder = path.join(__dirname, '../../../uploads/resumes');
    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder, { recursive: true });
    }
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).any();

// Submit responses for an application (with jobId - creates application first)
export const submitApplicationResponses = (req: Request, res: Response) => {
  // Handle file uploads first
  upload(req, res, async (err) => {
    if (err) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: err.message || 'File upload error',
        data: null,
      });
    }

    try {
      const { jobId, answers } = req.body;
      
      // Parse answers if it's a string
      let parsedAnswers: any[] = [];
      if (typeof answers === 'string') {
        parsedAnswers = JSON.parse(answers);
      } else if (Array.isArray(answers)) {
        parsedAnswers = answers;
      }

      if (!jobId) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message: 'Job ID is required',
          data: null,
        });
      }

      // Get job details
      const job = await Job.findById(jobId);
      if (!job) {
        return sendResponse(res, {
          statusCode: 404,
          success: false,
          message: 'Job not found',
          data: null,
        });
      }

      // Get template to extract field mappings
      const template = await FormTemplate.findOne({ jobId });
      
      // Extract name, email, phone, location from answers if available
      let name = '';
      let email = '';
      let phone = '';
      let location = '';
      let resumeUrl = '';
      const fileMap: Record<string, string> = {};
      const questionMap: Record<string, any> = {};

      // Build question map from template if available
      if (template && template.questions) {
        template.questions.forEach((q: any) => {
          questionMap[q._id?.toString() || q.id] = q;
        });
      }

      // Map uploaded files by field name
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        files.forEach((file) => {
          const fieldName = file.fieldname;
          const fileUrl = `/uploads/resumes/${file.filename}`;
          fileMap[fieldName] = fileUrl;
          
          // If it's a resume field, use it as resumeUrl
          if (fieldName.includes('resume') || fieldName.startsWith('file_')) {
            resumeUrl = fileUrl;
          }
        });
      }

      // Extract data from answers using template question labels
      parsedAnswers.forEach((answer: any) => {
        const questionId = answer.questionId;
        const answerValue = answer.answer;
        const question = questionMap[questionId];
        const questionLabel = question?.label?.toLowerCase() || '';
        
        // Update file URL if this answer has a corresponding file
        if (fileMap[`file_${questionId}`]) {
          answer.fileUrl = fileMap[`file_${questionId}`];
          if (!resumeUrl) {
            resumeUrl = fileMap[`file_${questionId}`];
          }
        }
        
        // Extract fields based on question label
        if (answerValue && typeof answerValue === 'string') {
          if (questionLabel.includes('name') || questionLabel.includes('full name')) {
            name = answerValue.trim();
          } else if (questionLabel.includes('email') || questionLabel.includes('e-mail')) {
            email = answerValue.trim();
          } else if (questionLabel.includes('phone') || questionLabel.includes('mobile') || questionLabel.includes('contact')) {
            phone = answerValue.trim();
          } else if (questionLabel.includes('location') || questionLabel.includes('address') || questionLabel.includes('city')) {
            location = answerValue.trim();
          } else if (questionLabel.includes('resume') || questionLabel.includes('cv')) {
            if (!resumeUrl && answer.fileUrl) {
              resumeUrl = answer.fileUrl;
            }
          }
        }
      });

      // Set defaults if not found
      if (!name) name = 'Test Applicant';
      if (!email) email = `test-${Date.now()}@example.com`;
      if (!phone) phone = '+1234567890';
      if (!location) location = 'Unknown';
      if (!resumeUrl) resumeUrl = '/uploads/resumes/default.pdf';

      // Check if email already exists for this job
      const existingApplication = await Application.findOne({ jobId, email: email.toLowerCase() });
      if (existingApplication) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message: 'This email has already applied for this job',
          data: null,
        });
      }

      // Create application
      const applicationData = {
        jobId,
        name,
        email: email.toLowerCase(),
        phone,
        location,
        resumeUrl,
        atsScore: 0, // Will be calculated later if needed
        extractedKeywords: [],
        status: 'pending',
      };

      const application = await Application.create(applicationData);

      // Increment job applicant count
      await Job.findByIdAndUpdate(jobId, {
        $inc: { applicantCount: 1 },
      });

      // Save responses
      const responsesToSave = parsedAnswers.map((answer: any) => ({
        applicationId: application._id.toString(),
        questionId: answer.questionId,
        answer: answer.fileUrl || answer.answer,
      }));

      const savedResponses = await ApplicationResponse.insertMany(responsesToSave);

      sendResponse(res, {
        statusCode: 201,
        success: true,
        message: 'Application and responses submitted successfully',
        data: {
          application,
          responses: savedResponses,
        },
      });
    } catch (error: any) {
      sendResponse(res, {
        statusCode: 500,
        success: false,
        message: error.message || 'Error submitting application',
        data: null,
      });
    }
  });
};

// Get responses for an application
export const getApplicationResponses = catchAsync(async (req: Request, res: Response) => {
  const { applicationId } = req.params;
  const responses = await ApplicationResponse.find({ applicationId });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Responses fetched',
    data: responses,
  });
});
