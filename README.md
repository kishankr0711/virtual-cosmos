# Virtual Cosmos

Virtual Cosmos is a real-time 2D multiplayer social room app built with React, PixiJS, Socket.IO, Node.js, and MongoDB.

Players join a lobby, pick a room, move as 2D avatars, and chat automatically when they come close.

## Features

- 2D canvas world with PixiJS avatars
- Keyboard movement (`WASD` + `Arrow` keys)
- Camera follow and smooth interpolation
- Real-time multiplayer sync using Socket.IO
- Proximity-based chat auto-open
- Dynamic room grouping with max members
- Lobby with room capacity and online user list
- Friend system:
  - send friend request
  - accept incoming request
  - view friends list with online/offline status
- Mini-map with live player positions
- Persistent user profile data in MongoDB

## Tech Stack

- Frontend: React + TypeScript + Vite + Zustand + PixiJS
- Backend: Node.js + Express + TypeScript + Socket.IO
- Database: MongoDB + Mongoose

## Project Structure

- `frontend/` - React app (UI, game rendering, lobby)
- `backend/` - API + Socket server + proximity logic + DB models

## Prerequisites

- Node.js 18+
- MongoDB running locally

## Localhost Setup

### 1) Backend env

Create `backend/.env`:

```env
PORT=3001
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/virtual-cosmos
```

### 2) Frontend env

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

### 3) Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 4) Run backend

```bash
cd backend
npm run dev
```

Backend runs at `http://localhost:3001`

### 5) Run frontend

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`

## How To Use

1. Open `http://localhost:5173`
2. Enter your name
3. Select a room and join
4. Move your avatar with `WASD` or arrow keys
5. Go near another user to auto-connect and open chat
6. Use lobby friends panel to send/accept friend requests

## Friend System

The friend panel appears on the lobby page.

- Add from online users list
- Incoming requests can be accepted
- Friends list shows online status and current lobby room

Backend friend APIs:

- `GET /api/friends/:profileId`
- `POST /api/friends/request`
- `POST /api/friends/accept`

## Scripts

### Backend

- `npm run dev` - start backend in watch mode
- `npm run build` - compile backend TypeScript
- `npm run start` - run compiled backend

### Frontend

- `npm run dev` - start Vite dev server
- `npm run build` - build frontend
- `npm run preview` - preview production build

## Notes

- Keep both frontend and backend running for real-time features.
- If chat or movement appears stale, confirm MongoDB is running and both env files use localhost URLs.
