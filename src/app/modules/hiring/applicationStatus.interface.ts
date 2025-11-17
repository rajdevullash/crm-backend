export interface IApplicationStatus {
  _id?: string;
  name: string;
  label: string; // Display label
  color?: string; // Color code for UI (e.g., '#3b82f6')
  department?: string; // If null, it's a global status
  order: number; // Display order
  isActive: boolean;
  isDefault?: boolean; // Default status for new applications
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

