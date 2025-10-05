export type CloudinaryUploadFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  public_id?: string; // Add this line to include public_id property
};
