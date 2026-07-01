import { useEffect, useState, useCallback } from "react";
import { useSearch, useLocation } from "wouter";
import { useSocket } from "@/hooks/use-socket";
import { useListAnimals } from "@workspace/api-client-react";
import { GameBoard, type HazardEvent, type BonusEvent } from "@/components/game-board";
import { RestorationFinale, type FinaleWinner } from "@/components/restoration-finale";
import { AnimalPortrait } from "@/components/animal-portrait";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { audio } from "@/lib/audio";

interface Player {
  id: string;
  name: string;
  animalId: string;
  position: number;
  ecoScore: number;
  correctAnswers: number;
  isHost: boolean;
  streak: number;
}

export default function HostView() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const socket = useSocket();

  const hostName = new URLSearchParams(search).get("hostName") || "Host";
  const { data: animals = [] } = useListAnimals();

  const [socketRoomId, setSocketRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<"waiting" | "playing" | "finished">("waiting");
  const [currentQuestion, setCurrentQuestion] = useState<{
    text: string;
    options: string[];
    zone: string;
    round: number;
    totalRounds: number;
    timeLeft: number;
  } | null>(null);
  const [roundResult, setRoundResult] = useState<{
    correctIndex: number;
    explanation: string;
  } | null>(null);
  const [hazardEvent, setHazardEvent] = useState<HazardEvent | null>(null);
  const [bonusEvent, setBonusEvent] = useState<BonusEvent | null>(null);
  const [ecosystemHealth, setEcosystemHealth] = useState<number>(30);
  const [finaleWinner, setFinaleWinner] = useState<FinaleWinner | null>(null);
  const [finaleShown, setFinaleShown] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Try to rejoin an existing room (e.g. after a brief disconnect), else create a new one
    const savedCode = sessionStorage.getItem("ecoquest_host_room_code");
    const savedName = sessionStorage.getItem("ecoquest_host_name");
    if (savedCode && savedName === hostName) {
      socket.emit("rejoin_host", { roomCode: savedCode });
    } else {
      socket.emit("create_room", { hostName });
    }

    socket.on("room_created", (data: { roomId: string; roomCode: string; players: Player[] }) => {
      setSocketRoomId(data.roomId);
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      sessionStorage.setItem("ecoquest_host_room_code", data.roomCode);
      sessionStorage.setItem("ecoquest_host_name", hostName);
    });

    socket.on("host_rejoined", (data: { roomId: string; roomCode: string; players: Player[]; state: string; currentRound: number; totalRounds: number }) => {
      setSocketRoomId(data.roomId);
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      if (data.state === "playing") setGameState("playing");
    });

    socket.on("player_joined", (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    socket.on("player_left", (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    socket.on("game_started", (data: { players: Player[] }) => {
      setGameState("playing");
      setPlayers(data.players);
      setEcosystemHealth(30);
    });

    socket.on("question", (data: { text: string; options: string[]; zone: string; round: number; totalRounds: number; timeLimit: number }) => {
      setRoundResult(null);
      setCurrentQuestion({
        text: data.text,
        options: data.options,
        zone: data.zone,
        round: data.round,
        totalRounds: data.totalRounds,
        timeLeft: data.timeLimit,
      });
      audio.setAmbience(data.zone);
    });

    socket.on("timer_tick", (data: { timeLeft: number }) => {
      setCurrentQuestion((prev) => prev ? { ...prev, timeLeft: data.timeLeft } : null);
    });

    socket.on("round_result", (data: { correctIndex: number; explanation: string; playerResults: any[]; leaderboard: any[] }) => {
      setRoundResult({ correctIndex: data.correctIndex, explanation: data.explanation });
      setCurrentQuestion(null);
      setPlayers((prev) =>
        prev.map((p) => {
          const lr = data.leaderboard.find((l: any) => l.playerId === p.id);
          return lr ? { ...p, position: lr.position, ecoScore: lr.ecoScore } : p;
        })
      );
      // Adjust ecosystem health: +4 per forward mover (correct), -2 per stationary/backward (wrong)
      if (data.playerResults && data.playerResults.length > 0) {
        const correctCount = data.playerResults.filter((r: any) => (r.moved ?? 0) > 0).length;
        const wrongCount = data.playerResults.length - correctCount;
        setEcosystemHealth(prev => Math.max(0, Math.min(100, prev + correctCount * 4 - wrongCount * 2)));
      }
    });

    socket.on("positions_updated", (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    socket.on("game_over", (data: { leaderboard: any[]; winner?: any }) => {
      setGameState("finished");
      sessionStorage.removeItem("ecoquest_host_room_code");
      sessionStorage.removeItem("ecoquest_host_name");
      if (data.winner) {
        setFinaleWinner({
          name: data.winner.name,
          animalId: data.winner.animalId,
          colorPrimary: data.winner.colorPrimary,
          colorSecondary: data.winner.colorSecondary,
          ecoScore: data.winner.ecoScore,
        });
      } else {
        setFinaleShown(true);
      }
    });

    socket.on("hazard_event", (data: { type: string; affectedPlayers: { playerId: string; tileIndex: number }[] }) => {
      const first = data.affectedPlayers?.[0];
      if (first) {
        setHazardEvent({ type: data.type || "hazard", tileIndex: first.tileIndex, playerId: first.playerId });
        setTimeout(() => setHazardEvent(null), 3000);
      }
      setEcosystemHealth(prev => Math.max(0, prev - 8 * (data.affectedPlayers?.length ?? 1)));
    });

    socket.on("bonus_event", (data: { type: string; affectedPlayers: { playerId: string; tileIndex: number }[] }) => {
      const first = data.affectedPlayers?.[0];
      if (first) {
        setBonusEvent({ tileIndex: first.tileIndex, playerId: first.playerId });
        setTimeout(() => setBonusEvent(null), 2500);
      }
      setEcosystemHealth(prev => Math.min(100, prev + 6 * (data.affectedPlayers?.length ?? 1)));
    });

    const handleRejoinError = (data: { message: string }) => {
      // If the saved room is gone or finished, start fresh
      if (data.message === "Room not found" || data.message === "Game already finished") {
        sessionStorage.removeItem("ecoquest_host_room_code");
        sessionStorage.removeItem("ecoquest_host_name");
        socket.emit("create_room", { hostName });
      }
    };
    socket.on("error", handleRejoinError);

    return () => {
      socket.off("room_created");
      socket.off("host_rejoined");
      socket.off("error", handleRejoinError);
      socket.off("player_joined");
      socket.off("player_left");
      socket.off("game_started");
      socket.off("question");
      socket.off("timer_tick");
      socket.off("round_result");
      socket.off("positions_updated");
      socket.off("game_over");
      socket.off("hazard_event");
      socket.off("bonus_event");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleFinaleComplete = useCallback(() => {
    setFinaleShown(true);
  }, []);

  const handleFinaleClose = useCallback(() => {
    setFinaleShown(false);
    setFinaleWinner(null);
  }, []);

  const handleViewResults = useCallback(() => {
    if (socketRoomId) setLocation(`/results/${socketRoomId}`);
  }, [socketRoomId, setLocation]);

  const handleStart = () => {
    if (!socketRoomId) return;
    audio.init();
    socket.emit("start_game", { roomId: socketRoomId });
  };

  const handleStop = () => {
    if (!socketRoomId) return;
    socket.emit("stop_game", { roomId: socketRoomId });
  };

  if (!roomCode) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
        <span className="ml-3 text-muted-foreground">Creating room…</span>
      </div>
    );
  }

  const nonHostPlayers = players.filter((p) => !p.isHost);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background overflow-hidden">
      {finaleWinner && !finaleShown && (
        <RestorationFinale winner={finaleWinner} onComplete={handleFinaleComplete} />
      )}
      {/* After finale: winner banner stays until host closes it */}
      {finaleWinner && finaleShown && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-primary/40 rounded-3xl p-10 flex flex-col items-center gap-5 shadow-2xl max-w-md w-full mx-4 text-center">
            <div className="text-6xl">🏆</div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-1">Winner</p>
              <p className="text-4xl font-bold text-primary">{finaleWinner.name}</p>
              <p className="text-lg text-muted-foreground mt-1">{finaleWinner.ecoScore} eco pts</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <Button variant="outline" className="flex-1" onClick={handleFinaleClose}>
                Back to Board
              </Button>
              <Button className="flex-1" onClick={handleViewResults}>
                View Results
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        <GameBoard players={players} animals={animals} hazardEvent={hazardEvent} bonusEvent={bonusEvent} ecosystemHealth={ecosystemHealth} />

        {currentQuestion && (
          <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur border rounded-xl p-4 shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Round {currentQuestion.round}/{currentQuestion.totalRounds} · {currentQuestion.zone}
              </span>
              <span className="font-mono font-bold text-lg">
                {Math.ceil(currentQuestion.timeLeft / 1000)}s
              </span>
            </div>
            <p className="font-semibold text-sm">{currentQuestion.text}</p>
          </div>
        )}

        {roundResult && (
          <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur border border-primary/30 rounded-xl p-4 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Round Result</p>
            <p className="text-sm text-muted-foreground">{roundResult.explanation}</p>
          </div>
        )}
      </div>

      <div className="w-full md:w-80 bg-card border-l flex flex-col p-4 z-10 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-primary mb-1">Room Code</h2>
          <div className="bg-muted text-muted-foreground text-4xl font-mono p-4 rounded-xl text-center tracking-widest uppercase">
            {roomCode}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">Players scan/type this to join</p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 mb-4">
          <h3 className="font-semibold text-lg mb-2">Players ({nonHostPlayers.length})</h3>
          {nonHostPlayers
            .slice()
            .sort((a, b) => (b.ecoScore ?? 0) - (a.ecoScore ?? 0))
            .map((p, i) => {
              const animal = animals.find((a) => a.id === p.animalId);
              return (
                <Card key={p.id || i} className="p-3 flex items-center gap-2">
                  <div className="shrink-0">
                    <AnimalPortrait
                      animalId={p.animalId}
                      colorPrimary={animal?.colorPrimary}
                      colorSecondary={animal?.colorSecondary}
                      size={32}
                    />
                  </div>
                  <span className="font-medium truncate flex-1 text-sm">{p.name}</span>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-primary">{p.ecoScore ?? 0}</div>
                    <div className="text-xs text-muted-foreground">tile {p.position + 1}</div>
                  </div>
                </Card>
              );
            })}
          {nonHostPlayers.length === 0 && (
            <div className="text-center text-muted-foreground p-4 text-sm">
              Waiting for players to join…
            </div>
          )}
        </div>

        <div className="pt-4 border-t space-y-3">
          {gameState === "waiting" && (
            <Button
              size="lg"
              className="w-full text-lg"
              onClick={handleStart}
              disabled={nonHostPlayers.length === 0}
            >
              {nonHostPlayers.length === 0 ? "Waiting for players…" : `Start Game (${nonHostPlayers.length})`}
            </Button>
          )}
          {gameState === "playing" && (
            <Button size="lg" variant="destructive" className="w-full text-lg" onClick={handleStop}>
              End Game
            </Button>
          )}
          {gameState === "finished" && (
            <Button size="lg" className="w-full text-lg" onClick={handleViewResults}>
              View Results
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
