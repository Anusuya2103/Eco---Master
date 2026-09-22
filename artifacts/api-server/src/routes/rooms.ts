import { Router, type IRouter } from "express";
import { rooms } from "../lib/gameEngine";
import { CreateRoomBody, GetRoomParams, GetRoomLeaderboardParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/rooms", (_req, res): void => {
  // Room creation must go through Socket.IO `create_room` event, not REST.
  // This endpoint exists to satisfy the OpenAPI schema contract only.
  res.status(501).json({
    error: "Room creation via REST is not supported. Connect via Socket.IO and emit 'create_room' instead.",
  });
});

router.get("/rooms/:id", (req, res): void => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetRoomParams.safeParse({ roomId: raw });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const room = rooms.get(parsed.data.roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json({
    id: room.id,
    code: room.code,
    hostName: room.hostName,
    state: room.state,
    playerCount: room.players.size,
    currentRound: room.currentRound,
    createdAt: new Date().toISOString(),
  });
});

router.get("/rooms/:id/leaderboard", (req, res): void => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetRoomLeaderboardParams.safeParse({ roomId: raw });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const room = rooms.get(parsed.data.roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const leaderboard = Array.from(room.players.values())
    .filter((p) => !p.isHost)
    .sort((a, b) => {
      // Primary: tile position (higher = better rank)
      if (b.position !== a.position) return b.position - a.position;
      if (b.ecoScore !== a.ecoScore) return b.ecoScore - a.ecoScore;
      return b.correctAnswers - a.correctAnswers;
    })
    .map((p, i) => ({
      rank: i + 1,
      playerId: p.id,
      playerName: p.name,
      animalId: p.animalId,
      ecoScore: p.ecoScore,
      position: p.position,
      correctAnswers: p.correctAnswers,
    }));

  res.json(leaderboard);
});

export default router;
