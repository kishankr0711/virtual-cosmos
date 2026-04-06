import { useEffect, useMemo, useState } from 'react';
import type { FriendSnapshot, LobbySnapshot } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LobbyMenuProps {
  onJoin: (payload: { profileId: string; name: string; lobbyRoomId: string }) => void;
}

const getProfileId = (): string => {
  const key = 'cosmos_profile_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = `p-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, id);
  return id;
};

const getSavedName = (): string => {
  return localStorage.getItem('cosmos_name') || '';
};

export const LobbyMenu = ({ onJoin }: LobbyMenuProps) => {
  const [snapshot, setSnapshot] = useState<LobbySnapshot>({ rooms: [], onlineUsers: [], onlineCount: 0 });
  const [friends, setFriends] = useState<FriendSnapshot>({ friends: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(getSavedName() || `Guest-${Math.random().toString(36).slice(2, 6)}`);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [statusText, setStatusText] = useState('');

  const profileId = useMemo(() => getProfileId(), []);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      try {
        const [lobbyRes, friendRes] = await Promise.all([
          fetch(`${API_URL}/api/lobby`),
          fetch(`${API_URL}/api/friends/${profileId}`)
        ]);

        const lobbyData = (await lobbyRes.json()) as LobbySnapshot;
        const friendData = (await friendRes.json()) as FriendSnapshot;

        if (!mounted) return;
        setSnapshot(lobbyData);
        setFriends(friendData);

        if (!selectedRoomId && lobbyData.rooms.length > 0) {
          setSelectedRoomId(lobbyData.rooms[0].roomId);
        }
      } catch {
        // ignore transient failures in polling
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchAll();
    const timer = setInterval(fetchAll, 2500);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [profileId, selectedRoomId]);

  const selectedRoom = snapshot.rooms.find((r) => r.roomId === selectedRoomId);
  const friendIds = new Set(friends.friends.map((f) => f.profileId));
  const outgoingIds = new Set(friends.outgoing.map((r) => r.toProfileId));

  const joinSelectedRoom = () => {
    const trimmedName = name.trim();
    if (!trimmedName || !selectedRoom) return;

    localStorage.setItem('cosmos_name', trimmedName);
    onJoin({ profileId, name: trimmedName, lobbyRoomId: selectedRoom.roomId });
  };

  const sendFriendRequest = async (toProfileId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromProfileId: profileId, toProfileId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed');
      setStatusText('Friend request sent');
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Failed to send request');
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, profileId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed');
      setStatusText('Friend request accepted');
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Failed to accept request');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3dfbf] flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
        <section className="bg-white/85 border border-[#d0b087] rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-[#2a2d35]">Virtual Cosmos Lobby</h1>
          <p className="text-sm text-[#5b5f6e] mt-1">Choose your room, set your name, and join the live world.</p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {snapshot.rooms.map((room) => (
              <button
                key={room.roomId}
                type="button"
                onClick={() => setSelectedRoomId(room.roomId)}
                className={`text-left rounded-xl p-4 border transition ${
                  selectedRoomId === room.roomId
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300 bg-white hover:border-indigo-400'
                }`}
              >
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold text-[#1f2430]">{room.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    Available
                  </span>
                </div>
                <p className="text-sm text-[#4a5161] mt-2">{room.occupancy} players</p>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="w-full sm:max-w-xs">
              <label className="text-xs font-semibold text-[#3d4353]">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <button
              type="button"
              onClick={joinSelectedRoom}
              disabled={!selectedRoom || !name.trim()}
              className="rounded-lg bg-indigo-600 text-white px-5 py-2.5 text-sm font-semibold disabled:bg-gray-400"
            >
              Join Room
            </button>
          </div>

          <div className="mt-6 h-56 overflow-y-auto rounded-lg border border-[#d8c6a5] p-3 bg-[#fff8ec]">
            <p className="text-xs uppercase tracking-wider text-[#53618a] mb-2">Players Online</p>
            {snapshot.onlineUsers.length === 0 ? (
              <p className="text-sm text-[#66718c]">No players online right now.</p>
            ) : (
              <ul className="space-y-2">
                {snapshot.onlineUsers.map((user) => {
                  const isSelf = user.profileId === profileId;
                  const alreadyFriend = friendIds.has(user.profileId);
                  const pending = outgoingIds.has(user.profileId);
                  return (
                    <li key={user.userId} className="flex justify-between items-center text-sm gap-2">
                      <div>
                        <div className="font-medium text-[#30384d]">{user.username}</div>
                        <div className="text-xs text-[#63708f]">{user.lobbyRoomId ?? 'Lobby'}</div>
                      </div>
                      {!isSelf && (
                        <button
                          onClick={() => sendFriendRequest(user.profileId)}
                          disabled={alreadyFriend || pending}
                          className="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 disabled:opacity-50"
                        >
                          {alreadyFriend ? 'Friend' : pending ? 'Pending' : 'Add'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="bg-[#101324] text-white rounded-2xl p-6 shadow-lg border border-[#2a3255]">
          <h3 className="text-lg font-semibold">Friends</h3>
          <div className="mt-3 space-y-2 text-sm text-indigo-100">
            <p>Total friends: {friends.friends.length}</p>
            <p>Online friends: {friends.friends.filter((f) => f.online).length}</p>
          </div>

          <div className="mt-4 h-40 overflow-y-auto rounded-lg border border-[#2f3a64] p-3 bg-[#0f1323]">
            <p className="text-xs uppercase tracking-wider text-indigo-300 mb-2">Friend List</p>
            {friends.friends.length === 0 ? (
              <p className="text-sm text-indigo-200/70">No friends yet.</p>
            ) : (
              <ul className="space-y-2">
                {friends.friends.map((friend) => (
                  <li key={friend.profileId} className="flex justify-between items-center text-sm">
                    <span>{friend.username}</span>
                    <span className={`text-xs ${friend.online ? 'text-emerald-300' : 'text-gray-400'}`}>
                      {friend.online ? `Online (${friend.lobbyRoomId ?? 'Lobby'})` : 'Offline'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 h-32 overflow-y-auto rounded-lg border border-[#2f3a64] p-3 bg-[#0f1323]">
            <p className="text-xs uppercase tracking-wider text-indigo-300 mb-2">Requests</p>
            {friends.incoming.length === 0 ? (
              <p className="text-sm text-indigo-200/70">No incoming requests.</p>
            ) : (
              <ul className="space-y-2">
                {friends.incoming.map((request) => (
                  <li key={request.id} className="flex justify-between items-center text-sm gap-2">
                    <span>{request.fromUsername}</span>
                    <button
                      onClick={() => acceptFriendRequest(request.id)}
                      className="text-xs px-2 py-1 rounded border border-emerald-300 text-emerald-200"
                    >
                      Accept
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {statusText && <p className="text-xs text-amber-300 mt-3">{statusText}</p>}
          {loading && <p className="text-xs text-indigo-300 mt-2">Loading lobby data...</p>}
        </aside>
      </div>
    </div>
  );
};
