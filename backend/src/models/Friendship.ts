import mongoose, { Document, Schema } from 'mongoose';

export interface IFriendship extends Document {
  userA: string;
  userB: string;
  createdAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>({
  userA: { type: String, required: true, index: true },
  userB: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

FriendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });

export const FriendshipModel = mongoose.model<IFriendship>('Friendship', FriendshipSchema);
