---
name: EcoQuest room flow
description: How host room creation works — Socket.IO only, not REST, for the real game room.
---

## Rule
Host room creation must happen via Socket.IO `create_room` event. The REST `POST /api/rooms` endpoint creates a lightweight stub that is NOT stored in the game engine's `rooms` Map.

## Why
The game engine (`gameEngine.ts`) stores rooms in an in-memory `rooms: Map<string, GameRoom>`. Only `create_room` via Socket.IO populates this map. The REST stub exists only to satisfy the OpenAPI contract but returns a fake `rest-<random>` ID. Navigating to `/host/:restId` and then calling `GET /api/rooms/:restId` returns 404.

## How to apply
- Home page: navigate to `/host?hostName=...` (no REST call)
- HostView: read hostName from `useSearch()`, emit `create_room` on socket mount, receive `room_created` with real `{roomId, roomCode}`, store in state
- All game events (`start_game`, `stop_game`) use the Socket.IO `roomId`
- Results page uses the Socket.IO `roomId` to call `GET /api/rooms/:id/leaderboard` — this works because the game engine room stays in memory until all players disconnect
