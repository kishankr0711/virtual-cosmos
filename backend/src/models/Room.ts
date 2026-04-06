import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  roomId: string;
  name: string;
  capacity: number;
  occupancy: number;
  isActive: boolean;
}
const RoomSchema = new Schema<IRoom>({
  roomId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  capacity: { type: Number, default: 8 },
  occupancy: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

export const RoomModel = mongoose.model<IRoom>('Room', RoomSchema);
