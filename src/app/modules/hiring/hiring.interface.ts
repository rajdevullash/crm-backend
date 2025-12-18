export type IJob = {
  _id?: string;
  title: string;
  department: string;
  location: string;
  workMode: 'Remote' | 'On-Site' | 'Hybrid';
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  salary: string;
  salaryMin?: string;
  salaryMax?: string;
  salaryCurrency?: string;
  salaryPeriod?: string;
  vacancy: number;
  description?: string;
  extractedKeywords?: string[]; // Keywords extracted from job description
  status: 'active' | 'closed' | 'draft';
  postedBy: {
    id: string;
    name: string;
    role: string;
  };
  hiringManagers?: {
    id: string;
    name: string;
    role: string;
  }[];
  postedDate: Date;
  closedDate?: Date;
  applicationDeadline?: Date;
  applicantCount?: number;
  autoReplyEmail?: boolean;
  autoReplyText?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IApplication = {
  _id?: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  resumeUrl?: string;
  coverLetter?: string;
  atsScore: number;
  extractedKeywords?: string[]; // Keywords extracted by ATS calculator
  remarks?: string; // free-form HR remarks
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired' | 'called' | 'meeting-scheduled' | 'task-assigned' | 'submitted' | 'meeting-done';
  appliedDate: Date;
  reviewedBy?: {
    id: string;
    name: string;
    role: string;
  };
  reviewedDate?: Date;
  notes?: Array<{
    text: string;
    addedBy: {
      id: string;
      name: string;
      role: string;
    };
    addedAt: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IJobFilters = {
  searchTerm?: string;
  status?: string;
  department?: string;
  type?: string;
}

export type IApplicationFilters = {
  searchTerm?: string;
  jobId?: string;
  status?: string;
  minAtsScore?: number;
}
