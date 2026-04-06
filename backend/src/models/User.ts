import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  profileId: string;
  userId: string;
  username: string;
  online: boolean;
  lobbyRoomId: string | null;
  createdAt: Date;
  lastLogin: Date;
  lastSeenAt: Date;
  stats: {
    totalTimeOnline: number;
    roomsJoined: number;
    messagesSent: number;
  };
}

const UserSchema = new Schema<IUser>({
  profileId: { type: String, required: true, index: true },
  userId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  online: { type: Boolean, default: false, index: true },
  lobbyRoomId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  stats: {
    totalTimeOnline: { type: Number, default: 0 },
    roomsJoined: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 }
  }
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);
