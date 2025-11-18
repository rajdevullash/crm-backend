export interface IPayslip {
  _id?: string;
  resourceId: string; // Reference to Resource
  employeeId: string;
  employeeName: string;
  month: string; // e.g., "October", "November"
  year: number;
  date: Date; // Payslip generation date
  baseSalary: number;
  allowances?: Array<{
    description: string;
    amount: number;
  }>;
  deductions?: Array<{
    description: string;
    amount: number;
  }>;
  totalAmount: number;
  generatedBy?: {
    id: string;
    name: string;
    role: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPayslipFilters {
  resourceId?: string;
  employeeId?: string;
  month?: string;
  year?: number;
  searchTerm?: string;
}

