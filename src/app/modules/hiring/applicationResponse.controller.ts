/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { ApplicationResponse } from './applicationResponse.model';
import { Application } from './application.model';
import { Job } from './job.model';
import { FormTemplate } from './formTemplate.model';
import { ApplicationStatus } from './applicationStatus.model';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multer configuration for dynamic file fields
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Always save to backend/uploads/resumes (root uploads directory)
    // This matches where static files are served from (process.cwd()/uploads)
    const uploadFolder = path.join(process.cwd(), 'uploads', 'resumes');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder, { recursive: true });
    }
    
    console.log(`📁 Saving resume to: ${uploadFolder}`);
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `file-${uniqueSuffix}${ext}`;
    console.log(`📄 Resume filename: ${filename}`);
    cb(null, filename);
  },
});

// eslint-disable-next-line no-undef
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
      // eslint-disable-next-line no-undef
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        files.forEach((file) => {
          const fieldName = file.fieldname;
          const fileUrl = `/uploads/resumes/${file.filename}`;
          fileMap[fieldName] = fileUrl;
          
          console.log(`📁 Uploaded file: ${file.filename}`);
          console.log(`📁 File saved to: ${file.path}`);
          console.log(`📁 File URL: ${fileUrl}`);
          
          // If it's a resume field, use it as resumeUrl
          if (fieldName.includes('resume') || fieldName.startsWith('file_')) {
            resumeUrl = fileUrl;
            console.log(`✅ Resume URL set to: ${resumeUrl}`);
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

      // Get default status for the job's department
      let defaultStatus = 'pending';
      try {
        const defaultStatusDoc = await ApplicationStatus.findOne({
          $or: [
            { department: job.department, isDefault: true, isActive: true },
            { department: null, isDefault: true, isActive: true },
          ],
        }).sort({ department: -1 }); // Prefer department-specific over global
        
        if (defaultStatusDoc) {
          defaultStatus = defaultStatusDoc.name;
        }
      } catch (error) {
        console.error('Error fetching default status:', error);
        // Use 'pending' as fallback
      }

      // Calculate ATS score and extract keywords if resume is available
      let atsScore = 0;
      let extractedKeywords: string[] = [];
      
      if (resumeUrl && resumeUrl !== '/uploads/resumes/default.pdf') {
        console.log(`🔍 Calculating ATS score for application to job: ${job.title}`);
        console.log(`📁 Resume path: ${resumeUrl}`);

        try {
          // Extract text from resume
          console.log('═══════════════════════════════════════════════');
          console.log('🔍 RESUME PARSING - STEP BY STEP DEBUG');
          console.log('═════════════════════════════════════════════════');
          console.log(`📁 Step 1: Resume file path: ${resumeUrl}`);

          const { extractResumeText, isLikelyResume } = await import('../../../helpers/resumeParser');
          console.log('📝 Step 2: Calling extractResumeText function...');

          const resumeText = await extractResumeText(resumeUrl);

          console.log('═════════════════════════════════════════════════');
          console.log(`📄 Step 3: Resume text extraction result`);
          console.log(`📊 Text length: ${resumeText.length} characters`);
          if (resumeText.length > 0) {
            console.log(`📄 Text preview (first 500 chars):\n${resumeText.substring(0, 500)}`);
          }
          console.log('═════════════════════════════════════════════════');

          if (resumeText && resumeText.trim().length > 0) {
            // Check if the document is likely a resume
            const isResume = isLikelyResume(resumeText);
            
            if (isResume) {
              console.log('✅ Resume text extracted and validated successfully');
              console.log('🔍 Step 4: Starting ATS score calculation...');
              
              // Calculate ATS score using resume text
              const { calculateATSScore } = await import('../../helpers/atsCalculator');
              
              const result = await calculateATSScore(job, {
                resumeText,
                location: location || '',
                coverLetter: '',
                name: name,
                email: email,
                phone: phone,
              });
              
              atsScore = result.score;
              extractedKeywords = result.applicantKeywords || [];
              
              console.log(`✅ ATS Score calculated: ${atsScore}%`);
              console.log(`📋 Applicant Keywords extracted: ${extractedKeywords.length} keywords -> [${extractedKeywords.join(', ')}]`);
            } else {
              console.log('⚠️  Document does not appear to be a resume');
              atsScore = 0;
              extractedKeywords = [];
            }
          } else {
            console.log('❌ ERROR: Resume text is empty! Cannot proceed with ATS calculation.');
            atsScore = 0;
            extractedKeywords = [];
          }
        } catch (error: any) {
          console.error('Error calculating ATS score:', error);
          // Continue with default values if ATS calculation fails
          atsScore = 0;
          extractedKeywords = [];
        }
      }

      // Create application
      const applicationData = {
        jobId,
        name,
        email: email.toLowerCase(),
        phone,
        location,
        resumeUrl,
        atsScore,
        extractedKeywords,
        status: defaultStatus,
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
