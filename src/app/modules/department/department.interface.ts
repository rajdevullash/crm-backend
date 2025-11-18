export type IDepartment = {
  _id?: string;
  name: string;
  description?: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

