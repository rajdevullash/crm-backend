export interface IJob {
  _id?: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  salary: string;
  vacancy: number;
  description?: string;
  extractedKeywords?: string[]; // Keywords extracted from job description
  status: 'active' | 'closed' | 'draft';
  postedBy: {
    id: string;
    name: string;
    role: string;
  };
  postedDate: Date;
  closedDate?: Date;
  applicantCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IApplication {
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

export interface IJobFilters {
  searchTerm?: string;
  status?: string;
  department?: string;
  type?: string;
}

export interface IApplicationFilters {
  searchTerm?: string;
  jobId?: string;
  status?: string;
  minAtsScore?: number;
}
