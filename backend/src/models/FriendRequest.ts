import mongoose, { Document, Schema } from 'mongoose';

export interface IFriendRequest extends Document {
  fromProfileId: string;
  toProfileId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    fromProfileId: { type: String, required: true, index: true },
    toProfileId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true
    }
  },
  { timestamps: true }
);

FriendRequestSchema.index(
  { fromProfileId: 1, toProfileId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export const FriendRequestModel = mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);
