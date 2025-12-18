import { IShift } from './shift.interface';
import { Shift } from './shift.model';

const createShift = async (payload: IShift): Promise<IShift> => {
  const result = await Shift.create(payload);
  return result;
};

const getAllShifts = async (): Promise<IShift[]> => {
  const result = await Shift.find();
  return result;
};

const updateShift = async (id: string, payload: Partial<IShift>): Promise<IShift | null> => {
  const result = await Shift.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

const deleteShift = async (id: string): Promise<IShift | null> => {
  const result = await Shift.findByIdAndDelete(id);
  return result;
};

export const ShiftService = {
  createShift,
  getAllShifts,
  updateShift,
  deleteShift,
};
