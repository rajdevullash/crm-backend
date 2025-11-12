/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { Job } from './job.model';
import { Application } from './application.model';
import { IJobFilters, IApplicationFilters } from './hiring.interface';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';

// Job Controllers
const createJob = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  const jobData = {
    ...req.body,
    postedBy: {
      id: user.userId,
      name: user.name || 'Unknown',
      role: user.role,
    },
  };

  const job = await Job.create(jobData);

  // Extract keywords from job description in background
  if (job.description) {
    try {
      const { extractJobKeywords } = await import('../../../helpers/jobKeywordExtractor');
      const keywords = await extractJobKeywords(job.toJSON());
      
      // Update job with extracted keywords
      job.extractedKeywords = keywords;
      await job.save();
      
      console.log(`✅ Extracted and stored ${keywords.length} keywords for job: ${job.title}`);
    } catch (error) {
      console.error('Error extracting keywords for job:', error);
      // Don't fail job creation if keyword extraction fails
    }
  }

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Job created successfully',
    data: job,
  });
});

const getAllJobs = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'status', 'department', 'type']);
  const paginationOptions = pick(req.query, paginationFields);

  const { searchTerm, ...filterData } = filters;

  const conditions: any = {};

  // Search term
  if (searchTerm) {
    conditions.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { department: { $regex: searchTerm, $options: 'i' } },
      { location: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // Other filters
  Object.keys(filterData).forEach((key) => {
    conditions[key] = (filterData as any)[key];
  });

  const page = Number(paginationOptions.page) || 1;
  const limit = Number(paginationOptions.limit) || 10;
  const skip = (page - 1) * limit;

  const sortBy = (paginationOptions.sortBy as string) || '-postedDate';

  const jobs = await Job.find(conditions)
    .sort(sortBy)
    .skip(skip)
    .limit(limit);

  const total = await Job.countDocuments(conditions);

  // Update applicant count for each job
  const jobsWithApplicantCount = await Promise.all(
    jobs.map(async (job) => {
      const applicantCount = await Application.countDocuments({ jobId: job._id?.toString() });
      return {
        ...job.toJSON(),
        applicantCount,
      };
    })
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Jobs retrieved successfully',
    meta: {
      page,
      limit,
      total,
    },
    data: jobsWithApplicantCount,
  });
});

const getSingleJob = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = await Job.findById(id);

  if (!job) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Job not found',
      data: null,
    });
  }

  // Get applicant count
  const applicantCount = await Application.countDocuments({ jobId: id });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Job retrieved successfully',
    data: {
      ...job.toJSON(),
      applicantCount,
    },
  });
});

const updateJob = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Remove fields that should not be updated
  const { postedBy, postedDate, applicantCount, ...updateData } = req.body;

  const job = await Job.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!job) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Job not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Job updated successfully',
    data: job,
  });
});

const deleteJob = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = await Job.findByIdAndDelete(id);

  if (!job) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Job not found',
      data: null,
    });
  }

  // Also delete all applications for this job
  await Application.deleteMany({ jobId: id });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Job and related applications deleted successfully',
    data: job,
  });
});

// Application Controllers
const createApplication = catchAsync(async (req: Request, res: Response) => {
  // Get the job details for ATS calculation
  const job = await Job.findById(req.body.jobId);

  if (!job) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Job not found',
      data: null,
    });
  }

  // Handle file uploads
  // eslint-disable-next-line no-undef
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  let resumeUrl = req.body.resumeUrl;

  if (files && files.resume && files.resume[0]) {
    resumeUrl = `/uploads/resumes/${files.resume[0].filename}`;
  }

  // Calculate ATS score using Gemini AI if not provided
  let atsScore = req.body.atsScore;
  let extractedKeywords: string[] = [];
  
  if (!atsScore || atsScore === 0) {
    console.log(`🔍 Calculating ATS score for application to job: ${job.title}`);
    console.log(`📁 Resume path: ${resumeUrl}`);
    
    // Extract text from resume
    const { extractResumeText } = await import('../../../helpers/resumeParser');
    const resumeText = await extractResumeText(resumeUrl);
    
    console.log(`📄 Resume text extracted: ${resumeText.length} characters`);
    
    // Calculate ATS score using resume text
    const { calculateATSScore } = await import('../../helpers/atsCalculator');
    
    const result = await calculateATSScore(job, {
      resumeText,
      location: req.body.location || '',
      coverLetter: req.body.coverLetter || '',
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    });
    
    atsScore = result.score;
    // Store applicant keywords (from resume), not job keywords
    extractedKeywords = result.applicantKeywords || [];
    
    console.log(`✅ ATS Score calculated: ${atsScore}%`);
    console.log(`📋 Applicant Keywords extracted: ${extractedKeywords.length} keywords`);
  }

  // Create application with calculated ATS score and keywords
  const applicationData = {
    ...req.body,
    resumeUrl,
    atsScore,
    extractedKeywords,
  };

  const application = await Application.create(applicationData);

  // Increment job applicant count
  await Job.findByIdAndUpdate(req.body.jobId, {
    $inc: { applicantCount: 1 },
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Application submitted successfully',
    data: application,
  });
});

const getApplicationsByJob = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const filters = pick(req.query, ['searchTerm', 'status', 'minAtsScore']);
  const paginationOptions = pick(req.query, paginationFields);

  const { searchTerm, minAtsScore, ...filterData } = filters;

  const conditions: any = { jobId };

  // Search term
  if (searchTerm) {
    conditions.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // Min ATS score filter
  if (minAtsScore) {
    conditions.atsScore = { $gte: Number(minAtsScore) };
  }

  // Other filters
  Object.keys(filterData).forEach((key) => {
    conditions[key] = (filterData as any)[key];
  });

  const page = Number(paginationOptions.page) || 1;
  const limit = Number(paginationOptions.limit) || 50;
  const skip = (page - 1) * limit;

  // Sort by ATS score descending (highest first) by default
  const sortBy = (paginationOptions.sortBy as string) || '-atsScore';

  const applications = await Application.find(conditions)
    .sort(sortBy)
    .skip(skip)
    .limit(limit);

  const total = await Application.countDocuments(conditions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Applications retrieved successfully',
    meta: {
      page,
      limit,
      total,
    },
    data: applications,
  });
});

const getSingleApplication = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const application = await Application.findById(id);

  if (!application) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Application not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Application retrieved successfully',
    data: application,
  });
});

const updateApplication = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  // Get the current application to check previous status
  const currentApplication = await Application.findById(id);
  if (!currentApplication) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Application not found',
      data: null,
    });
  }

  const updateData = { ...req.body };

  // If status is being updated, add reviewer info
  if (req.body.status && req.body.status !== 'pending') {
    updateData.reviewedBy = {
      id: user.userId,
      name: user.name || 'Unknown',
      role: user.role,
    };
    updateData.reviewedDate = new Date();
  }

  const application = await Application.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!application) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Application not found',
      data: null,
    });
  }

  // If status changed to 'hired', create a resource
  if (req.body.status === 'hired' && currentApplication.status !== 'hired') {
    try {
      const { ResourceService } = await import('../resource/resource.service');
      const { Job } = await import('./job.model');
      
      // Get job details for department
      const job = await Job.findById(application.jobId);
      
      if (job) {
        // Create resource from application data
        // Note: Fields like nid, address, bankDetails, emergencyContact use placeholder values
        // and should be updated later through the resource edit page
        const resourceData: any = {
          name: application.name,
          email: application.email,
          phone: application.phone,
          department: job.department,
          position: job.title,
          joiningDate: new Date(),
          workMode: 'on-site' as const, // Default, can be updated later
          jobType: job.type === 'Internship' ? 'internship' as const : 'permanent' as const,
          jobStatus: 'probation' as const, // Default status
          salary: 0, // Set to 0 initially, will be updated later
          // employeeId will be generated automatically in the service
          // nid will use default "To be updated" from model
          applicationId: application._id?.toString(),
          // Provide complete address objects with placeholder values
          presentAddress: {
            street: application.location || 'To be updated',
            city: 'To be updated',
            state: 'To be updated',
            zipCode: '0000',
            country: 'Bangladesh',
          },
          permanentAddress: {
            street: application.location || 'To be updated',
            city: 'To be updated',
            state: 'To be updated',
            zipCode: '0000',
            country: 'Bangladesh',
          },
          // Provide complete bank details with placeholder values
          bankDetails: {
            name: 'To be updated',
            accountNumber: 'To be updated',
            routingNumber: 'To be updated',
          },
          // Provide complete emergency contact with placeholder values
          emergencyContact: {
            name: 'To be updated',
            phone: 'To be updated',
            relation: 'To be updated',
          },
        };

        await ResourceService.createResource(
          resourceData,
          user.userId,
          user.name,
          user.role
        );

        console.log(`✅ Resource created for hired application: ${application.name}`);
      }
    } catch (error) {
      console.error('Error creating resource for hired application:', error);
      // Don't fail the application update if resource creation fails
    }
  }

  // If status changed from 'hired' to something else, delete resource and user
  if (currentApplication.status === 'hired' && req.body.status && req.body.status !== 'hired') {
    try {
      const { Resource } = await import('../resource/resource.model');
      const { ResourceService } = await import('../resource/resource.service');
      const { AuthService } = await import('../auth/auth.service');
      
      // Find resource by applicationId
      const resource = await Resource.findOne({ applicationId: id });
      
      if (resource) {
        // Delete user if exists
        if (resource.userId) {
          try {
            await AuthService.deleteUser(resource.userId);
            console.log(`✅ User deleted: ${resource.userId}`);
          } catch (error) {
            console.error('Error deleting user:', error);
            // Continue with resource deletion even if user deletion fails
          }
        }
        
        // Delete resource
        await ResourceService.deleteResource(resource._id?.toString() || '');
        console.log(`✅ Resource deleted for application: ${application.name}`);
      }
    } catch (error) {
      console.error('Error deleting resource and user:', error);
      // Don't fail the application update if deletion fails
    }
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Application updated successfully',
    data: application,
  });
});

const deleteApplication = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const application = await Application.findByIdAndDelete(id);

  if (!application) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Application not found',
      data: null,
    });
  }

  // Decrement job applicant count
  await Job.findByIdAndUpdate(application.jobId, {
    $inc: { applicantCount: -1 },
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Application deleted successfully',
    data: application,
  });
});

const addApplicationNote = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;
  const user = (req as any).user;

  const note = {
    text,
    addedBy: {
      id: user.userId,
      name: user.name || 'Unknown',
      role: user.role,
    },
    addedAt: new Date(),
  };

  const application = await Application.findByIdAndUpdate(
    id,
    { $push: { notes: note } },
    { new: true, runValidators: true }
  );

  if (!application) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Application not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Note added successfully',
    data: application,
  });
});

// Regenerate ATS score with custom keywords
const regenerateATSScore = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { keywords } = req.body;

  // Fetch the application
  const application = await Application.findById(id);
  if (!application) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Application not found',
      data: null,
    });
  }

  // Fetch the job details
  const job = await Job.findById(application.jobId);
  if (!job) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Job not found',
      data: null,
    });
  }

  // Extract resume text
  const { extractResumeText } = await import('../../../helpers/resumeParser');
  const resumeText = await extractResumeText(application.resumeUrl || '');
  
  console.log(`📄 Resume text extracted: ${resumeText.length} characters`);
  
  // Check if resume text is available
  if (!resumeText || resumeText.trim().length === 0) {
    console.log('⚠️  No resume text available. Cannot regenerate ATS score.');
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'Resume text could not be extracted. Please ensure the resume file is valid.',
      data: null,
    });
  }

  // Import the ATS calculator
  const { calculateATSScore } = await import('../../helpers/atsCalculator');

  // Calculate new ATS score with custom keywords if provided
  let newScore: number;
  let newKeywords: string[] = [];
  
  try {
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      // Use custom keywords for comparison
      const { compareApplicantWithKeywords, initializeGemini } = await import('../../helpers/atsCalculator');
      const model = initializeGemini();
      
      if (model) {
        newScore = await compareApplicantWithKeywords(model.getGenerativeModel({ model: 'gemini-2.0-flash' }), keywords, {
          resumeText,
          location: application.location || '',
          coverLetter: application.coverLetter,
          name: application.name,
          email: application.email,
          phone: application.phone,
        });
        newKeywords = keywords; // Store custom keywords
        console.log(`✅ ATS Score calculated with custom keywords: ${newScore}%`);
      } else {
        // Fallback to basic calculation
        const result = await calculateATSScore(job, {
          resumeText,
          location: application.location || '',
          coverLetter: application.coverLetter,
          name: application.name,
          email: application.email,
          phone: application.phone,
        });
        newScore = result.score;
        newKeywords = result.keywords;
        console.log(`✅ ATS Score calculated (fallback): ${newScore}%`);
      }
    } else {
      // Calculate with original method (extract keywords from job)
      const result = await calculateATSScore(job, {
        resumeText,
        location: application.location || '',
        coverLetter: application.coverLetter,
        name: application.name,
        email: application.email,
        phone: application.phone,
      });
      newScore = result.score;
      newKeywords = result.keywords;
      console.log(`✅ ATS Score calculated: ${newScore}%`);
    }
    
    // Ensure score is valid (between 0-100)
    if (isNaN(newScore) || newScore < 0) {
      console.log('⚠️  Invalid score calculated. Using default score of 50.');
      newScore = 50;
    }
    if (newScore > 100) {
      newScore = 100;
    }
  } catch (error) {
    console.error('Error calculating ATS score:', error);
    return sendResponse(res, {
      statusCode: 500,
      success: false,
      message: 'Error calculating ATS score. Please try again.',
      data: null,
    });
  }

  // Update the application with new score and keywords
  application.atsScore = newScore;
  application.extractedKeywords = newKeywords;
  await application.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'ATS score regenerated successfully',
    data: application,
  });
});

export const HiringController = {
  // Job controllers
  createJob,
  getAllJobs,
  getSingleJob,
  updateJob,
  deleteJob,
  // Application controllers
  createApplication,
  getApplicationsByJob,
  getSingleApplication,
  updateApplication,
  deleteApplication,
  addApplicationNote,
  regenerateATSScore,
};
