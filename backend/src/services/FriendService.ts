import { FriendRequestModel } from '../models/FriendRequest.js';
import { FriendshipModel } from '../models/Friendship.js';
import { UserModel } from '../models/User.js';

export class FriendService {
  async sendRequest(fromProfileId: string, toProfileId: string): Promise<void> {
    if (!fromProfileId || !toProfileId || fromProfileId === toProfileId) {
      throw new Error('Invalid friend request');
    }

    const [from, to] = await Promise.all([
      UserModel.findOne({ profileId: fromProfileId }).lean(),
      UserModel.findOne({ profileId: toProfileId }).lean()
    ]);

    if (!from || !to) {
      throw new Error('User not found');
    }

    const [a, b] = [fromProfileId, toProfileId].sort();
    const existing = await FriendshipModel.findOne({ userA: a, userB: b }).lean();
    if (existing) {
      throw new Error('Already friends');
    }

    const reversePending = await FriendRequestModel.findOne({
      fromProfileId: toProfileId,
      toProfileId: fromProfileId,
      status: 'pending'
    });

    if (reversePending) {
      reversePending.status = 'accepted';
      await reversePending.save();
      await FriendshipModel.updateOne(
        { userA: a, userB: b },
        { $setOnInsert: { userA: a, userB: b, createdAt: new Date() } },
        { upsert: true }
      );
      return;
    }

    await FriendRequestModel.updateOne(
      { fromProfileId, toProfileId, status: 'pending' },
      { $setOnInsert: { fromProfileId, toProfileId, status: 'pending' } },
      { upsert: true }
    );
  }

  async acceptRequest(requestId: string, profileId: string): Promise<void> {
    const req = await FriendRequestModel.findOne({ _id: requestId, toProfileId: profileId, status: 'pending' });
    if (!req) {
      throw new Error('Request not found');
    }

    req.status = 'accepted';
    await req.save();

    const [a, b] = [req.fromProfileId, req.toProfileId].sort();
    await FriendshipModel.updateOne(
      { userA: a, userB: b },
      { $setOnInsert: { userA: a, userB: b, createdAt: new Date() } },
      { upsert: true }
    );
  }

  async getSnapshot(profileId: string) {
    const friendships = await FriendshipModel.find({
      $or: [{ userA: profileId }, { userB: profileId }]
    }).lean();

    const friendProfileIds = friendships.map((f) => (f.userA === profileId ? f.userB : f.userA));

    const [friendUsers, incoming, outgoing] = await Promise.all([
      UserModel.find({ profileId: { $in: friendProfileIds } })
        .select({ profileId: 1, username: 1, online: 1, lobbyRoomId: 1, _id: 0 })
        .lean(),
      FriendRequestModel.find({ toProfileId: profileId, status: 'pending' }).sort({ createdAt: -1 }).lean(),
      FriendRequestModel.find({ fromProfileId: profileId, status: 'pending' }).sort({ createdAt: -1 }).lean()
    ]);

    const incomingSenders = await UserModel.find({
      profileId: { $in: incoming.map((r) => r.fromProfileId) }
    })
      .select({ profileId: 1, username: 1, _id: 0 })
      .lean();

    const senderMap = new Map(incomingSenders.map((u) => [u.profileId, u.username]));

    return {
      friends: friendUsers.map((u) => ({
        profileId: u.profileId,
        username: u.username,
        online: Boolean(u.online),
        lobbyRoomId: u.lobbyRoomId ?? null
      })),
      incoming: incoming.map((r) => ({
        id: String(r._id),
        fromProfileId: r.fromProfileId,
        fromUsername: senderMap.get(r.fromProfileId) || r.fromProfileId,
        createdAt: r.createdAt
      })),
      outgoing: outgoing.map((r) => ({
        id: String(r._id),
        toProfileId: r.toProfileId,
        createdAt: r.createdAt
      }))
    };
  }
}
