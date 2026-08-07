import { Server as SocketIOServer, type Socket } from "socket.io";
import { type Server as HTTPServer } from "http";
import { logger } from "./logger";
import { ANIMALS, QUESTIONS } from "./gameData";

export interface Player {
  id: string;
  name: string;
  animalId: string;
  position: number;
  ecoScore: number;
  correctAnswers: number;
  isHost: boolean;
  streak: number;
  answeredThisRound: boolean;
  frozenRounds: number;
  /** Opaque token issued at join; required to prove identity on rejoin. */
  rejoinToken: string;
}

/** Safe subset of Player emitted over the wire — no tokens or timer handles. */
export type PlayerView = Omit<Player, "rejoinToken">;

export interface GameRoom {
  id: string;
  code: string;
  hostName: string;
  hostSocketId: string;
  state: "waiting" | "playing" | "finished";
  players: Map<string, Player>;
  usedQuestions: Set<string>;
  currentQuestion: (typeof QUESTIONS)[0] | null;
  currentRound: number;
  totalRounds: number; // kept for socket compat but no longer used as a limit
  roundTimer: ReturnType<typeof setTimeout> | null;
  tickInterval: ReturnType<typeof setInterval> | null;
  roundProcessing: boolean;
  roundAnswers: Map<string, number>;
  hostReconnectTimer: ReturnType<typeof setTimeout> | null;
}

// In-memory store — exported so REST routes can read room data
export const rooms = new Map<string, GameRoom>();
export const socketToRoom = new Map<string, string>();
export const socketToPlayer = new Map<string, string>();
// Maps room code → room id
const codeToRoom = new Map<string, string>();
// Disconnect grace-period timers stored OUTSIDE Player so timer handles never
// end up in socket emit payloads (they contain circular references that crash
// the Socket.IO hasBinary serialiser with "Maximum call stack size exceeded").
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Strip server-only fields before sending a player over the wire. */
function serializePlayer(p: Player): PlayerView {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { rejoinToken, ...view } = p;
  return view;
}

function serializePlayers(players: Player[]): PlayerView[] {
  return players.map(serializePlayer);
}

const TILE_COUNT = 100;
const ROUND_TIME_MS = 12000;

function pickQuestion(room: GameRoom) {
  const available = QUESTIONS.filter((q) => !room.usedQuestions.has(q.id));
  if (available.length === 0) {
    // Reuse questions if we run out
    room.usedQuestions.clear();
    return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

function getTileType(tileIndex: number): "hazard" | "bonus" | "normal" {
  if (tileIndex > 0 && tileIndex % 7 === 0) return "hazard";
  if (tileIndex > 0 && tileIndex % 11 === 0) return "bonus";
  return "normal";
}

function buildLeaderboard(room: GameRoom) {
  return Array.from(room.players.values())
    .sort((a, b) => {
      // Primary: tile position (higher = better)
      if (b.position !== a.position) return b.position - a.position;
      // Tiebreaker: eco score
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
}

function getScoreMultiplier(streak: number): number {
  if (streak >= 4) return 3;
  if (streak >= 3) return 2;
  if (streak >= 2) return 1.5;
  return 1;
}

function getAnimalMoveRange(animalId: string): { min: number; max: number } {
  const animal = ANIMALS.find((a) => a.id === animalId);
  return animal ? animal.moveRange : { min: 2, max: 4 };
}

function processRound(io: SocketIOServer, room: GameRoom) {
  if (!room.currentQuestion) return;
  if (room.roundProcessing) return; // idempotency guard — prevent double-processing
  room.roundProcessing = true;

  const q = room.currentQuestion;
  const playerResults: {
    playerId: string;
    correct: boolean;
    moved: number;
    newPosition: number;
    ecoScore: number;
    streak: number;
  }[] = [];
  const hazardAffected: string[] = [];
  const bonusAffected: string[] = [];

  for (const [, player] of room.players) {
    if (player.frozenRounds > 0) {
      player.frozenRounds -= 1;
      playerResults.push({
        playerId: player.id,
        correct: false,
        moved: 0,
        newPosition: player.position,
        ecoScore: player.ecoScore,
        streak: player.streak,
      });
      continue;
    }

    const answerIndex = room.roundAnswers.get(player.id);
    const correct = answerIndex === q.correctIndex;

    if (correct) {
      player.correctAnswers += 1;
      player.streak += 1;
      const multiplier = getScoreMultiplier(player.streak);
      const range = getAnimalMoveRange(player.animalId);
      const move =
        range.min + Math.floor(Math.random() * (range.max - range.min + 1));
      const baseScore = 10 + (q.difficulty === "hard" ? 5 : q.difficulty === "medium" ? 2 : 0);
      const scored = Math.round(baseScore * multiplier);
      player.ecoScore += scored;
      player.position = Math.min(player.position + move, TILE_COUNT);
      playerResults.push({
        playerId: player.id,
        correct: true,
        moved: move,
        newPosition: player.position,
        ecoScore: player.ecoScore,
        streak: player.streak,
      });
    } else {
      player.streak = 0;
      // Wrong answer: no penalty for sea turtles, small penalty otherwise
      const animal = ANIMALS.find((a) => a.id === player.animalId);
      const resistance = animal?.hazardResistance ?? 0.5;
      // 50% chance of going back 1 tile, modified by hazard resistance
      if (Math.random() > resistance && player.position > 1) {
        player.position = Math.max(1, player.position - 1);
      }
      playerResults.push({
        playerId: player.id,
        correct: false,
        moved: 0,
        newPosition: player.position,
        ecoScore: player.ecoScore,
        streak: 0,
      });
    }

    // Check hazard/bonus tiles
    const tileType = getTileType(player.position);
    if (tileType === "hazard") {
      const animal = ANIMALS.find((a) => a.id === player.animalId);
      const resistance = animal?.hazardResistance ?? 0.5;
      if (Math.random() > resistance) {
        const penalty = Math.floor(5 + Math.random() * 10);
        player.ecoScore = Math.max(0, player.ecoScore - penalty);
        player.position = Math.max(1, player.position - 1);
        hazardAffected.push(player.id);
      }
    } else if (tileType === "bonus") {
      const bonus = Math.floor(5 + Math.random() * 10);
      player.ecoScore += bonus;
      bonusAffected.push(player.id);
    }

    player.answeredThisRound = false;
  }

  const leaderboard = buildLeaderboard(room);
  const playersArray = serializePlayers(Array.from(room.players.values()));

  io.to(room.id).emit("round_result", {
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    playerResults,
    leaderboard,
  });

  // Emit hazard/bonus events if any tiles triggered
  if (hazardAffected.length > 0) {
    const hazardPayload = hazardAffected.map((id) => ({
      playerId: id,
      tileIndex: room.players.get(id)?.position ?? 0,
    }));
    io.to(room.id).emit("hazard_event", {
      type: ["predator", "pollution", "drought"][Math.floor(Math.random() * 3)],
      affectedPlayers: hazardPayload,
    });
  }
  if (bonusAffected.length > 0) {
    const bonusPayload = bonusAffected.map((id) => ({
      playerId: id,
      tileIndex: room.players.get(id)?.position ?? 0,
    }));
    io.to(room.id).emit("bonus_event", {
      type: ["tree_plant", "cleanup", "rain"][Math.floor(Math.random() * 3)],
      affectedPlayers: bonusPayload,
    });
  }

  // Broadcast updated positions
  io.to(room.id).emit("positions_updated", { players: playersArray });

  // Check win condition: anyone reached tile 100?
  const winner = Array.from(room.players.values()).find(
    (p) => p.position >= TILE_COUNT
  );
  if (winner) {
    endGame(io, room);
    return;
  }

  // Next round after 3 second break
  setTimeout(() => {
    if (room.state === "playing") {
      startRound(io, room);
    }
  }, 3000);
}

function startRound(io: SocketIOServer, room: GameRoom) {
  // The first round is scheduled slightly after start_game. If the host ends
  // the game during that delay, do not emit a question into the finished room.
  if (room.state !== "playing") return;

  room.currentRound += 1;
  room.roundAnswers.clear();
  room.roundProcessing = false;
  const q = pickQuestion(room);
  room.currentQuestion = q;
  room.usedQuestions.add(q.id);

  io.to(room.id).emit("question", {
    questionId: q.id,
    text: q.text,
    options: q.options,
    zone: q.zone,
    timeLimit: ROUND_TIME_MS,
    round: room.currentRound,
    totalRounds: room.totalRounds,
  });

  // Timer ticks every second — stored on room so any early-end path can cancel it
  let timeLeft = ROUND_TIME_MS;
  if (room.tickInterval) clearInterval(room.tickInterval);
  room.tickInterval = setInterval(() => {
    timeLeft -= 1000;
    io.to(room.id).emit("timer_tick", { timeLeft });
    if (timeLeft <= 0) {
      clearInterval(room.tickInterval!);
      room.tickInterval = null;
    }
  }, 1000);

  // Auto-process round after time limit
  if (room.roundTimer) clearTimeout(room.roundTimer);
  room.roundTimer = setTimeout(() => {
    if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
    processRound(io, room);
  }, ROUND_TIME_MS);
}

function endGame(io: SocketIOServer, room: GameRoom) {
  room.state = "finished";
  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }

  const leaderboard = buildLeaderboard(room);
  const winner = Array.from(room.players.values()).find(
    (p) => p.position >= TILE_COUNT
  ) ?? Array.from(room.players.values()).sort((a, b) => b.position - a.position || b.ecoScore - a.ecoScore)[0];

  io.to(room.id).emit("game_over", {
    leaderboard,
    winner: winner
      ? {
          id: winner.id,
          name: winner.name,
          animalId: winner.animalId,
          position: winner.position,
          ecoScore: winner.ecoScore,
          correctAnswers: winner.correctAnswers,
          isHost: winner.isHost,
          streak: winner.streak,
          answeredThisRound: false,
          frozenRounds: 0,
        }
      : null,
  });
}

export function initSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["polling", "websocket"],
  });

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    // ── Create room (Host) ──────────────────────────────────────────────────
    socket.on("create_room", ({ hostName }: { hostName: string }) => {
      const roomId = `room-${Math.random().toString(36).substring(2, 10)}`;
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const room: GameRoom = {
        id: roomId,
        code,
        hostName,
        hostSocketId: socket.id,
        state: "waiting",
        players: new Map(),
        usedQuestions: new Set(),
        currentQuestion: null,
        currentRound: 0,
        totalRounds: 50,
        roundTimer: null,
        tickInterval: null,
        roundProcessing: false,
        roundAnswers: new Map(),
        hostReconnectTimer: null,
      };

      const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      const hostPlayer: Player = {
        id: socket.id,
        name: hostName,
        animalId: randomAnimal.id,
        position: 0,
        ecoScore: 0,
        correctAnswers: 0,
        isHost: true,
        streak: 0,
        answeredThisRound: false,
        frozenRounds: 0,
        rejoinToken: "", // host reconnects via room code + hostName, not token
      };

      room.players.set(socket.id, hostPlayer);
      rooms.set(roomId, room);
      codeToRoom.set(code, roomId);
      socketToRoom.set(socket.id, roomId);
      socketToPlayer.set(socket.id, socket.id);

      socket.join(roomId);
      socket.emit("room_created", {
        roomId,
        roomCode: code,
        playerId: socket.id,
        players: serializePlayers(Array.from(room.players.values())),
      });

      logger.info({ roomId, code, hostName }, "Room created");
    });

    // ── Join room (Player) ─────────────────────────────────────────────────
    socket.on(
      "join_room",
      ({
        roomCode,
        playerName,
        animalId,
      }: {
        roomCode: string;
        playerName: string;
        animalId: string;
      }) => {
        const roomId = codeToRoom.get(roomCode.toUpperCase());
        if (!roomId) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const room = rooms.get(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        if (room.state !== "waiting") {
          socket.emit("error", { message: "Game already in progress" });
          return;
        }

        // Enforce unique player names within the room (case-insensitive)
        const nameTaken = Array.from(room.players.values()).some(
          (p) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
        );
        if (nameTaken) {
          socket.emit("error", { message: "That name is already taken in this room" });
          return;
        }

        // Generate a per-player rejoin token so name-based rejoin can't be
        // spoofed by another client that just knows the room code + player name.
        const rejoinToken =
          Math.random().toString(36).substring(2) +
          Math.random().toString(36).substring(2);

        const player: Player = {
          id: socket.id,
          name: playerName,
          animalId: animalId || "rabbit",
          position: 0,
          ecoScore: 0,
          correctAnswers: 0,
          isHost: false,
          streak: 0,
          answeredThisRound: false,
          frozenRounds: 0,
          rejoinToken,
        };

        room.players.set(socket.id, player);
        socketToRoom.set(socket.id, roomId);
        socketToPlayer.set(socket.id, socket.id);

        socket.join(roomId);

        const players = serializePlayers(Array.from(room.players.values()));
        socket.emit("room_joined", {
          roomId,
          roomCode,
          playerId: socket.id,
          rejoinToken,
          players,
        });

        socket.to(roomId).emit("player_joined", { player: serializePlayer(player), players });
        logger.info({ roomId, playerName, animalId }, "Player joined room");
      }
    );

    // ── Update animal selection ────────────────────────────────────────────
    socket.on("select_animal", ({ animalId }: { animalId: string }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;

      player.animalId = animalId;
      const players = serializePlayers(Array.from(room.players.values()));
      io.to(roomId).emit("player_updated", { player: serializePlayer(player), players });
    });

    // ── Start game (Host only) ─────────────────────────────────────────────
    socket.on("start_game", ({ roomId }: { roomId: string }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.hostSocketId !== socket.id) return;
      if (room.state !== "waiting") return;
      if (room.players.size < 1) return;

      room.state = "playing";
      room.currentRound = 0;

      // Reset all player positions
      for (const p of room.players.values()) {
        p.position = 0;
        p.ecoScore = 0;
        p.correctAnswers = 0;
        p.streak = 0;
      }

      io.to(roomId).emit("game_started", {
        round: 1,
        totalRounds: room.totalRounds,
        players: serializePlayers(Array.from(room.players.values())),
      });

      setTimeout(() => startRound(io, room), 1500);
      logger.info({ roomId }, "Game started");
    });

    // ── Submit answer ──────────────────────────────────────────────────────
    socket.on(
      "submit_answer",
      ({
        roomId,
        questionId,
        answerIndex,
      }: {
        roomId: string;
        questionId: string;
        answerIndex: number;
      }) => {
        const room = rooms.get(roomId);
        if (!room || room.state !== "playing") return;
        if (!room.currentQuestion || room.currentQuestion.id !== questionId)
          return;

        const player = room.players.get(socket.id);
        if (!player || player.answeredThisRound) return;

        player.answeredThisRound = true;
        room.roundAnswers.set(socket.id, answerIndex);

        // Broadcast that player has answered (without revealing the answer)
        io.to(roomId).emit("player_answered", {
          playerId: socket.id,
          playerName: player.name,
        });

        // If all non-host players answered, process early
        const nonHostCount = Array.from(room.players.values()).filter((p) => !p.isHost).length;
        const nonHostAnswered = Array.from(room.roundAnswers.keys()).filter(
          (id) => !room.players.get(id)?.isHost
        ).length;
        if (nonHostCount > 0 && nonHostAnswered >= nonHostCount) {
          if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
          if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
          setTimeout(() => processRound(io, room), 500);
        }
      }
    );

    // ── Stop game (Host only) ──────────────────────────────────────────────
    socket.on("stop_game", ({ roomId }: { roomId: string }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.hostSocketId !== socket.id) return;

      logger.info({ roomId }, "Game stopped by host");
      endGame(io, room);
    });

    // ── Rejoin as host after disconnect ────────────────────────────────────
    socket.on("rejoin_host", ({ roomCode }: { roomCode: string }) => {
      const roomId = codeToRoom.get(roomCode.toUpperCase());
      if (!roomId) { socket.emit("error", { message: "Room not found" }); return; }
      const room = rooms.get(roomId);
      if (!room) { socket.emit("error", { message: "Room not found" }); return; }
      if (room.state === "finished") { socket.emit("error", { message: "Game already finished" }); return; }

      // Cancel pending host-end timer
      if (room.hostReconnectTimer) {
        clearTimeout(room.hostReconnectTimer);
        room.hostReconnectTimer = null;
      }

      // Re-assign host socket — move host player record to new socket id
      const oldHostPlayer = room.players.get(room.hostSocketId);
      if (oldHostPlayer) {
        room.players.delete(room.hostSocketId);
        socketToRoom.delete(room.hostSocketId);
        socketToPlayer.delete(room.hostSocketId);
        oldHostPlayer.id = socket.id;
        room.players.set(socket.id, oldHostPlayer);
      }
      room.hostSocketId = socket.id;
      socketToRoom.set(socket.id, roomId);
      socketToPlayer.set(socket.id, socket.id);

      socket.join(roomId);
      socket.emit("host_rejoined", {
        roomId,
        roomCode,
        playerId: socket.id,
        players: serializePlayers(Array.from(room.players.values())),
        state: room.state,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
      });
      logger.info({ roomId, socketId: socket.id }, "Host rejoined");
    });

    // ── Rejoin as player after disconnect ──────────────────────────────────
    socket.on("rejoin_player", ({ roomCode, playerName, rejoinToken }: { roomCode: string; playerName: string; rejoinToken: string }) => {
      const roomId = codeToRoom.get(roomCode.toUpperCase());
      if (!roomId) { socket.emit("error", { message: "Room not found" }); return; }
      const room = rooms.get(roomId);
      if (!room) { socket.emit("error", { message: "Room not found" }); return; }
      if (room.state === "finished") { socket.emit("error", { message: "Game already finished" }); return; }

      // Find the existing player record by name (case-insensitive).
      // Players are kept in room.players during their grace period, so this
      // lookup succeeds even after a brief disconnect.
      let foundOldId: string | null = null;
      let foundPlayer: Player | null = null;
      for (const [sid, p] of room.players.entries()) {
        if (!p.isHost && p.name.trim().toLowerCase() === playerName.trim().toLowerCase()) {
          foundOldId = sid;
          foundPlayer = p;
          break;
        }
      }
      if (!foundPlayer || !foundOldId) { socket.emit("error", { message: "Player not found in room" }); return; }

      // Validate the rejoin token to prevent one client from impersonating
      // another just by knowing the room code and someone else's name.
      if (foundPlayer.rejoinToken !== rejoinToken) {
        socket.emit("error", { message: "Invalid rejoin token" });
        return;
      }

      // Cancel the grace-period deletion timer
      const existingTimer = disconnectTimers.get(foundOldId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        disconnectTimers.delete(foundOldId);
      }

      // Re-map to new socket id
      room.players.delete(foundOldId);
      socketToRoom.delete(foundOldId);
      socketToPlayer.delete(foundOldId);

      foundPlayer.id = socket.id;
      room.players.set(socket.id, foundPlayer);
      socketToRoom.set(socket.id, roomId);
      socketToPlayer.set(socket.id, socket.id);

      socket.join(roomId);

      const currentQ = room.currentQuestion;
      socket.emit("player_rejoined", {
        roomId,
        roomCode,
        playerId: socket.id,
        players: serializePlayers(Array.from(room.players.values())),
        state: room.state,
        currentRound: room.currentRound,
        // Send the live question so the player can answer if a round is in progress
        currentQuestion: currentQ ? {
          questionId: currentQ.id,
          text: currentQ.text,
          options: currentQ.options,
          zone: currentQ.zone,
          timeLimit: ROUND_TIME_MS,
          round: room.currentRound,
          totalRounds: room.totalRounds,
        } : null,
      });

      // Notify others (not the rejoining socket itself)
      socket.to(roomId).emit("player_joined", {
        player: serializePlayer(foundPlayer),
        players: serializePlayers(Array.from(room.players.values())),
      });
      logger.info({ roomId, playerName, socketId: socket.id }, "Player rejoined");
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          const isHost = room.hostSocketId === socket.id;

          if (isHost) {
            // Give the host 60 s to reconnect before ending the game
            socketToRoom.delete(socket.id);
            socketToPlayer.delete(socket.id);
            io.to(roomId).emit("host_disconnected", {});
            logger.info({ roomId }, "Host disconnected — 60 s grace period started");

            if (room.hostReconnectTimer) clearTimeout(room.hostReconnectTimer);
            room.hostReconnectTimer = setTimeout(() => {
              if (room.state === "playing") {
                logger.info({ roomId }, "Host grace period expired — ending game");
                endGame(io, room);
              }
              room.players.delete(socket.id);
              if (room.players.size === 0) {
                rooms.delete(roomId);
                codeToRoom.delete(room.code);
              }
            }, 60_000);
          } else {
            // Give the player 30 s to reconnect before removing their record.
            // During the grace period their entry stays in room.players so that
            // rejoin_player can find and re-bind them by token.
            socketToRoom.delete(socket.id);
            socketToPlayer.delete(socket.id);

            const disconnectingPlayer = room.players.get(socket.id);
            if (disconnectingPlayer) {
              // Cancel any existing timer for this socket (e.g. double-disconnect)
              const existing = disconnectTimers.get(socket.id);
              if (existing) clearTimeout(existing);

              const dcSocketId = socket.id; // capture for closure
              const timer = setTimeout(() => {
                disconnectTimers.delete(dcSocketId);
                room.players.delete(dcSocketId);
                if (room.players.size === 0) {
                  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
                  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
                  rooms.delete(roomId);
                  codeToRoom.delete(room.code);
                } else {
                  io.to(roomId).emit("player_left", {
                    playerId: dcSocketId,
                    players: serializePlayers(Array.from(room.players.values())),
                  });
                }
              }, 30_000);
              disconnectTimers.set(socket.id, timer);
            }
          }
        }
      }

      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}
