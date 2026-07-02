import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useSocket } from "@/hooks/use-socket";
import { useListAnimals } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlayerMiniBoard } from "@/components/player-mini-board";
import { AnimalPortrait } from "@/components/animal-portrait";
import { toast } from "@/hooks/use-toast";
import { audio } from "@/lib/audio";

function isTileHazard(i: number) { return i > 0 && i % 7 === 0; }
function isTileBonus(i: number) { return i > 0 && i % 11 === 0 && i % 7 !== 0; }

interface PlayerState {
  id: string;
  name: string;
  animalId: string;
  position: number;
  ecoScore: number;
  isHost?: boolean;
}

interface RoundResult {
  correct: boolean;
  moved: number;
  newPosition: number;
  explanation: string;
  correctOption: string;
}

type Phase = "join" | "waiting" | "board" | "question" | "answered" | "gameover";

export default function PlayerView() {
  const { roomCode } = useParams();
  const [, setLocation] = useLocation();
  const socket = useSocket();
  const { data: animals = [] } = useListAnimals();

  const [playerName, setPlayerName] = useState("");
  const [animalId, setAnimalId] = useState("");

  const [phase, setPhase] = useState<Phase>("join");
  const [roomId, setRoomId] = useState("");
  const [myPlayerId, setMyPlayerId] = useState("");
  const [winner, setWinner] = useState<{ name: string; animalId: string; ecoScore: number; colorPrimary?: string; colorSecondary?: string } | null>(null);
  const [myFinalRank, setMyFinalRank] = useState(0);
  const [myFinalScore, setMyFinalScore] = useState(0);
  const [allPlayers, setAllPlayers] = useState<PlayerState[]>([]);
  const [streak, setStreak] = useState(0);
  const [correctIndexResult, setCorrectIndexResult] = useState<number | null>(null);

  const [question, setQuestion] = useState<{
    questionId: string;
    text: string;
    options: string[];
    zone: string;
    timeLimit: number;
    round: number;
    totalRounds: number;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const boardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref so the round_result handler always reads the current question without
  // being in the useEffect dep array (which would re-register all listeners on
  // every new question, creating a gap where events can be missed).
  const questionRef = useRef(question);
  useEffect(() => { questionRef.current = question; }, [question]);

  const handleRoundResult = useCallback((data: {
    correctIndex: number;
    explanation: string;
    playerResults: { playerId: string; correct: boolean; moved: number; newPosition: number; ecoScore: number }[];
    leaderboard: { playerId: string; position: number; ecoScore: number }[];
  }) => {
    setAllPlayers((prev) =>
      prev.map((p) => {
        const lr = data.leaderboard.find((l) => l.playerId === p.id);
        return lr ? { ...p, position: lr.position, ecoScore: lr.ecoScore } : p;
      })
    );

    setCorrectIndexResult(data.correctIndex);

    setMyPlayerId((myId) => {
      const myResult = data.playerResults.find((r) => r.playerId === myId);
      const currentQuestion = questionRef.current;
      if (myResult && currentQuestion) {
        if (myResult.correct) {
          audio.playDing();
          setStreak((s) => s + 1);
        } else {
          audio.playBuzz();
          setStreak(0);
        }
        setTimeout(() => {
          const pos = myResult.newPosition;
          if (isTileHazard(pos)) audio.playHazard();
          else if (isTileBonus(pos)) audio.playBonus();
        }, 900);
        setRoundResult({
          correct: myResult.correct,
          moved: myResult.moved,
          newPosition: myResult.newPosition,
          explanation: data.explanation,
          correctOption: currentQuestion.options[data.correctIndex] ?? "",
        });
      }
      return myId;
    });

    setQuestion(null);
    setPhase("board");

    boardTimerRef.current = setTimeout(() => {
      setPhase("waiting");
      setRoundResult(null);
    }, 5000);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("room_joined", (data: { roomId: string; playerId: string; players: PlayerState[] }) => {
      setRoomId(data.roomId);
      setMyPlayerId(data.playerId);
      setAllPlayers(data.players);
      setPhase("waiting");
    });

    socket.on("player_joined", (data: { players: PlayerState[] }) => {
      setAllPlayers(data.players);
    });

    socket.on("positions_updated", (data: { players: PlayerState[] }) => {
      setAllPlayers(data.players);
    });

    socket.on("question", (data: {
      questionId: string; text: string; options: string[];
      zone: string; timeLimit: number; round: number; totalRounds: number;
    }) => {
      if (boardTimerRef.current) clearTimeout(boardTimerRef.current);
      setHostDisconnected(false);
      setRoundResult(null);
      setCorrectIndexResult(null);
      setQuestion(data);
      setTimeLeft(data.timeLimit);
      setChosenIndex(null);
      setPhase("question");
      audio.setAmbience(data.zone);
    });

    socket.on("timer_tick", (data: { timeLeft: number }) => {
      setTimeLeft(data.timeLeft);
      const secs = Math.ceil(data.timeLeft / 1000);
      if (secs <= 3) audio.playCountdownUrgent();
      else if (secs <= 6) audio.playTick();
    });

    socket.on("round_result", handleRoundResult);

    socket.on("game_over", (data: { leaderboard: { playerId: string; ecoScore: number }[]; winner?: { name: string; animalId: string; ecoScore: number; colorPrimary?: string; colorSecondary?: string } }) => {
      audio.playFanfare();
      setPhase("gameover");
      if (data.winner) setWinner(data.winner);
      setMyPlayerId((myId) => {
        const rank = data.leaderboard.findIndex((l) => l.playerId === myId) + 1;
        const score = data.leaderboard.find((l) => l.playerId === myId)?.ecoScore ?? 0;
        setMyFinalRank(rank);
        setMyFinalScore(score);
        return myId;
      });
    });

    socket.on("host_disconnected", () => {
      setHostDisconnected(true);
    });

    socket.on("error", (data: { message: string }) => {
      toast({ title: data.message, variant: "destructive" });
    });

    return () => {
      socket.off("room_joined");
      socket.off("player_joined");
      socket.off("positions_updated");
      socket.off("question");
      socket.off("timer_tick");
      socket.off("round_result", handleRoundResult);
      socket.off("game_over");
      socket.off("host_disconnected");
      socket.off("error");
    };
  }, [socket, handleRoundResult]);

  const handleJoin = () => {
    if (!playerName.trim()) {
      toast({ title: "Enter your name", variant: "destructive" });
      return;
    }
    if (!animalId) {
      toast({ title: "Pick an animal", variant: "destructive" });
      return;
    }
    audio.init();
    socket.emit("join_room", { roomCode, playerName: playerName.trim(), animalId });
  };

  const handleAnswer = (index: number) => {
    if (chosenIndex !== null || !question || !roomId) return;
    socket.emit("submit_answer", { roomId, questionId: question.questionId, answerIndex: index });
    setChosenIndex(index);
    setPhase("answered");
  };

  // ── JOIN SCREEN ───────────────────────────────────────────────────────────
  if (phase === "join") {
    const selectedAnimal = animals.find((a) => a.id === animalId);
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-background">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary">EcoQuest</h1>
          <p className="text-muted-foreground text-sm">
            Room: <span className="font-mono font-bold text-foreground">{roomCode}</span>
          </p>
        </div>
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Your Name</label>
              <Input
                placeholder="Enter your name…"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="text-base"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Pick your animal</label>
              <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1">
                {animals.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAnimalId(a.id)}
                    className={`flex items-center justify-center p-1 rounded-lg border-2 transition-all ${
                      animalId === a.id
                        ? "border-primary bg-primary/15 scale-110"
                        : "border-transparent hover:bg-muted"
                    }`}
                    title={a.name}
                  >
                    <AnimalPortrait
                      animalId={a.id}
                      colorPrimary={a.colorPrimary}
                      colorSecondary={a.colorSecondary}
                      size={36}
                      highlighted={animalId === a.id}
                    />
                  </button>
                ))}
              </div>
            </div>
            {selectedAnimal && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <AnimalPortrait
                  animalId={selectedAnimal.id}
                  colorPrimary={selectedAnimal.colorPrimary}
                  colorSecondary={selectedAnimal.colorSecondary}
                  size={28}
                />
                <span>{selectedAnimal.name} selected</span>
              </div>
            )}
            <Button className="w-full h-12 text-base" onClick={handleJoin}>
              Join Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── GAME OVER ─────────────────────────────────────────────────────────────
  if (phase === "gameover") {
    const isWinner = myFinalRank === 1;
    const winnerAnimal = winner ? animals.find((a) => a.id === winner.animalId) : null;
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-background gap-6">
        {/* Trophy */}
        <div className="text-7xl animate-bounce">{isWinner ? "🏆" : "🎖️"}</div>

        {/* Winner announcement */}
        {winner && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Winner</p>
            <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-2xl px-5 py-3">
              {winnerAnimal && (
                <AnimalPortrait
                  animalId={winnerAnimal.id}
                  colorPrimary={winner.colorPrimary ?? winnerAnimal.colorPrimary}
                  colorSecondary={winner.colorSecondary ?? winnerAnimal.colorSecondary}
                  size={48}
                />
              )}
              <div className="text-left">
                <p className="text-xl font-bold text-primary leading-tight">{winner.name}</p>
                <p className="text-sm text-muted-foreground">{winner.ecoScore} eco pts</p>
              </div>
            </div>
          </div>
        )}

        {/* This player's result */}
        <div className="flex flex-col items-center gap-1">
          {isWinner ? (
            <p className="text-2xl font-bold text-amber-500">You won! 🎉</p>
          ) : (
            <p className="text-xl font-semibold text-foreground">You finished <span className="text-primary">#{myFinalRank}</span></p>
          )}
          <p className="text-sm text-muted-foreground">Final eco-score: <span className="font-bold text-foreground">{myFinalScore}</span></p>
        </div>

        {/* View results */}
        <Button
          size="lg"
          className="w-full max-w-xs text-base"
          onClick={() => setRoomId((rid) => { setLocation(`/results/${rid}`); return rid; })}
        >
          View Full Results
        </Button>
      </div>
    );
  }

  const myAnimal = animals.find((a) => a.id === animalId);
  const answerLetters = ["A", "B", "C", "D"];

  // ── IN-GAME SCREENS ───────────────────────────────────────────────────────
  const myLivePlayer = allPlayers.find((p) => p.id === myPlayerId);
  const myLiveScore = myLivePlayer?.ecoScore ?? 0;
  const myLiveRank = [...allPlayers]
    .filter((p) => !p.isHost)
    .sort((a, b) => (b.ecoScore ?? 0) - (a.ecoScore ?? 0))
    .findIndex((p) => p.id === myPlayerId) + 1;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          {myAnimal ? (
            <AnimalPortrait
              animalId={myAnimal.id}
              colorPrimary={myAnimal.colorPrimary}
              colorSecondary={myAnimal.colorSecondary}
              size={28}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-muted" />
          )}
          <span className="font-semibold text-sm truncate max-w-[100px]">{playerName}</span>
          {streak >= 2 && (
            <span className="text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
              🔥{streak}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {myLiveRank > 0 && (
            <span className="text-xs font-bold bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
              #{myLiveRank}
            </span>
          )}
          <span className="text-sm font-bold text-foreground tabular-nums">{myLiveScore} <span className="text-xs font-normal text-muted-foreground">pts</span></span>
        </div>
      </div>

      {hostDisconnected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-400 text-sm font-medium">
          <span className="animate-pulse">⚠️</span>
          Waiting for host to reconnect…
        </div>
      )}

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">

        {/* ── WAITING ──────────────────────────────────────────────────── */}
        {phase === "waiting" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="animate-bounce">
              {myAnimal ? (
                <AnimalPortrait
                  animalId={myAnimal.id}
                  colorPrimary={myAnimal.colorPrimary}
                  colorSecondary={myAnimal.colorSecondary}
                  size={72}
                  highlighted
                />
              ) : (
                <div className="w-18 h-18 rounded-full bg-muted" />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-muted-foreground">Get ready…</h2>
              <p className="text-sm text-muted-foreground mt-1">Waiting for the host to start</p>
            </div>
            <div className="w-full mt-4">
              <PlayerMiniBoard
                players={allPlayers}
                myPlayerId={myPlayerId}
                animals={animals}
              />
            </div>
          </div>
        )}

        {/* ── BOARD VIEW (between questions) ───────────────────────────── */}
        {phase === "board" && (
          <div className="flex-1 flex flex-col gap-4">
            {roundResult ? (
              <>
                {/* Big correct / wrong feedback */}
                <div className={`rounded-2xl p-4 flex flex-col gap-1 ${
                  roundResult.correct
                    ? "bg-emerald-500/15 border border-emerald-500/30"
                    : "bg-red-500/15 border border-red-500/30"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{roundResult.correct ? "✅" : "❌"}</span>
                    <div>
                      <p className={`font-bold text-base ${roundResult.correct ? "text-emerald-400" : "text-red-400"}`}>
                        {roundResult.correct
                          ? `Correct! +${roundResult.moved} tile${roundResult.moved !== 1 ? "s" : ""}`
                          : roundResult.moved < 0
                          ? `Wrong — moved back ${Math.abs(roundResult.moved)} tile${Math.abs(roundResult.moved) !== 1 ? "s" : ""}`
                          : "Wrong — no move"}
                      </p>
                      {streak >= 2 && roundResult.correct && (
                        <p className="text-xs text-orange-400 font-semibold">🔥 {streak} in a row!</p>
                      )}
                    </div>
                  </div>
                  {!roundResult.correct && roundResult.correctOption && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Correct answer: <span className="font-semibold text-foreground">{roundResult.correctOption}</span>
                    </p>
                  )}
                  {roundResult.explanation && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{roundResult.explanation}</p>
                  )}
                </div>

                {/* Tile position */}
                <div className="text-center text-sm text-muted-foreground">
                  Now on tile <span className="font-bold text-foreground">{roundResult.newPosition + 1}</span>
                  {" · "}Eco score: <span className="font-bold text-primary">{myLiveScore}</span>
                </div>
              </>
            ) : (
              <div className="text-center">
                <h2 className="text-lg font-bold">Round Result</h2>
                <p className="text-xs text-muted-foreground">Next question coming…</p>
              </div>
            )}
            <PlayerMiniBoard
              players={allPlayers}
              myPlayerId={myPlayerId}
              animals={animals}
              result={roundResult ?? undefined}
            />
          </div>
        )}

        {/* ── QUESTION ─────────────────────────────────────────────────── */}
        {(phase === "question" || phase === "answered") && question && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      question.zone === "forest" ? "#14532d44" :
                      question.zone === "ocean" ? "#1e3a5f44" :
                      question.zone === "desert" ? "#78350f44" :
                      question.zone === "human_impact" ? "#37415144" : "#134e2a44",
                    color:
                      question.zone === "forest" ? "#4ade80" :
                      question.zone === "ocean" ? "#60a5fa" :
                      question.zone === "desert" ? "#fbbf24" :
                      question.zone === "human_impact" ? "#9ca3af" : "#86efac",
                  }}
                >
                  {question.zone.replace("_", " ")} · Round {question.round}
                </span>
              </div>
              <div className={`font-mono font-bold text-lg tabular-nums ${
                Math.ceil(timeLeft / 1000) <= 3 ? "text-red-400 animate-pulse" : "text-foreground"
              }`}>
                {Math.ceil(timeLeft / 1000)}s
              </div>
            </div>

            <Progress
              value={(timeLeft / question.timeLimit) * 100}
              className={`h-2 ${Math.ceil(timeLeft / 1000) <= 3 ? "[&>div]:bg-red-500" : ""}`}
            />

            <h3 className="text-lg font-bold leading-snug text-center px-1">
              {question.text}
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {question.options.map((opt, i) => {
                const isChosen = chosenIndex === i;
                const isCorrectAnswer = correctIndexResult !== null && i === correctIndexResult;
                const isWrongChosen = correctIndexResult !== null && isChosen && !isCorrectAnswer;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={chosenIndex !== null}
                    className={`
                      w-full rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium
                      transition-all duration-200 flex items-center gap-3
                      ${correctIndexResult !== null
                        ? isCorrectAnswer
                          ? "border-emerald-500 bg-emerald-500/20 opacity-100"
                          : isWrongChosen
                          ? "border-red-500 bg-red-500/20 opacity-100"
                          : "border-border/30 bg-card/30 opacity-30 cursor-not-allowed"
                        : chosenIndex === null
                        ? "border-border bg-card hover:border-primary hover:bg-primary/10 active:scale-[0.98]"
                        : isChosen
                        ? "border-primary bg-primary/20 opacity-100"
                        : "border-border/40 bg-card/40 opacity-40 cursor-not-allowed"
                      }
                    `}
                  >
                    <span className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${correctIndexResult !== null
                        ? isCorrectAnswer
                          ? "bg-emerald-500 text-white"
                          : isWrongChosen
                          ? "bg-red-500 text-white"
                          : "bg-muted text-muted-foreground"
                        : isChosen
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                      }
                    `}>
                      {correctIndexResult !== null
                        ? isCorrectAnswer ? "✓" : isWrongChosen ? "✗" : answerLetters[i]
                        : answerLetters[i]}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {phase === "answered" && (
              <div className="text-center text-sm text-muted-foreground animate-pulse py-2">
                Answer locked in — waiting for round to end…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
