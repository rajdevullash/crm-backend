export type WorkMode = 'on-site' | 'remote';
export type JobType = 'permanent' | 'internship';
export type JobStatus = 'confirmed' | 'probation' | 'resigned';

export interface IAddress {
  street: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface IBankDetails {
  name: string;
  accountNumber: string;
  routingNumber: string;
}

export interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IJobHistory {
  workMode: WorkMode;
  jobType: JobType;
  jobStatus: JobStatus;
  position: string;
  department: string;
  salary: number;
  changedAt: Date;
  changedBy?: {
    id: string;
    name: string;
    role: string;
  };
  changeReason?: string;
}

export interface ISalaryHistory {
  salary: number;
  percentageChange?: number;
  changedAt: Date;
  changedBy?: {
    id: string;
    name: string;
    role: string;
  };
  changeReason?: string;
}

export interface IPositionHistory {
  position: string;
  department: string;
  changedAt: Date;
  changedBy?: {
    id: string;
    name: string;
    role: string;
  };
  changeReason?: string;
}

export interface IResource {
  _id?: string;
  // Personal Information
  name: string;
  employeeId: string; // Unique employee ID
  nid: string; // National ID
  phone: string;
  secondaryPhone?: string;
  email: string;
  secondaryEmail?: string;
  presentAddress: IAddress;
  permanentAddress: IAddress;
  
  // Job Information
  joiningDate: Date;
  workMode: WorkMode;
  jobType: JobType;
  jobStatus: JobStatus;
  position: string;
  department: string;
  salary: number;
  
  // History Tracking
  jobHistory: IJobHistory[]; // Track work mode, job type, job status changes
  salaryHistory: ISalaryHistory[]; // Track salary changes with percentage
  positionHistory: IPositionHistory[]; // Track position changes
  
  // Bank Details
  bankDetails: IBankDetails;
  
  // Emergency Contact
  emergencyContact: IEmergencyContact;
  
  // Attachments
  attachments: Array<{
    name: string;
    url: string;
    documentType?: 'NID' | 'Offer Letter' | 'Appointment Letter' | 'Experience Letter' | 'Contract' | 'Resume' | 'Certificate' | 'Other';
    uploadedAt: Date;
    uploadedBy?: {
      id: string;
      name: string;
      role: string;
    };
  }>;
  
  // User reference (if user is created)
  userId?: string; // Reference to User model
  
  // Application reference (if created from application)
  applicationId?: string; // Reference to Application model
  
  // Metadata
  createdBy?: {
    id: string;
    name: string;
    role: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IResourceFilters {
  searchTerm?: string;
  department?: string;
  position?: string;
  workMode?: WorkMode;
  jobType?: JobType;
  jobStatus?: JobStatus;
}

