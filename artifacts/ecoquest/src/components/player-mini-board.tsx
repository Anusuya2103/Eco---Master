import { useRef, useEffect } from "react";
import { drawAnimalPortrait } from "../lib/animal-draw";

interface Animal {
  id: string;
  emoji: string;
  colorPrimary?: string;
}

interface MiniPlayer {
  id: string;
  name: string;
  animalId: string;
  position: number;
  ecoScore: number;
}

interface RoundResult {
  correct: boolean;
  moved: number;
  newPosition: number;
  explanation: string;
  correctOption: string;
}

interface PlayerMiniBoardProps {
  players: MiniPlayer[];
  myPlayerId: string;
  animals: Animal[];
  result?: RoundResult | null;
}

const TILES = 100;
const ZONES = [
  { label: "Forest", color: "#166534", accent: "#22c55e" },
  { label: "Ocean", color: "#1e3a5f", accent: "#3b82f6" },
  { label: "Desert", color: "#78350f", accent: "#f59e0b" },
  { label: "Human Impact", color: "#374151", accent: "#9ca3af" },
  { label: "Restoration", color: "#14532d", accent: "#4ade80" },
];

function getZone(pos: number) {
  return ZONES[Math.min(4, Math.floor(pos / 20))];
}

export function PlayerMiniBoard({ players, myPlayerId, animals, result }: PlayerMiniBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const playersRef = useRef(players);
  const animalsRef = useRef(animals);
  const myIdRef = useRef(myPlayerId);
  const lastTimeRef = useRef(0);

  // Animated positions for each player
  const animPos = useRef<Map<string, number>>(new Map());

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { animalsRef.current = animals; }, [animals]);
  useEffect(() => { myIdRef.current = myPlayerId; }, [myPlayerId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      const rect = canvas.getBoundingClientRect();
      const W = Math.floor(rect.width);
      const H = Math.floor(rect.height);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      ctx.clearRect(0, 0, W, H);

      const trackH = Math.round(H * 0.48);
      const trackY = Math.round(H * 0.22);
      const trackX = 32;
      const trackW = W - 64;
      const segW = trackW / TILES;
      const tokenR = Math.min(trackH * 0.38, 14);

      // Zone backgrounds on the track
      ZONES.forEach((z, zi) => {
        const x0 = trackX + (zi * 20) * segW;
        const x1 = trackX + ((zi + 1) * 20) * segW;
        ctx.fillStyle = z.color + "cc";
        ctx.beginPath();
        ctx.roundRect(x0, trackY, x1 - x0, trackH, zi === 0 ? [6, 0, 0, 6] : zi === 4 ? [0, 6, 6, 0] : 0);
        ctx.fill();

        // Zone border
        ctx.strokeStyle = z.accent + "66";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Zone label
        ctx.save();
        ctx.font = `bold ${Math.max(8, trackH * 0.2)}px sans-serif`;
        ctx.fillStyle = z.accent + "bb";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(z.label, (x0 + x1) / 2, trackY + trackH * 0.75);
        ctx.restore();
      });

      // 0 and 100 labels
      ctx.save();
      ctx.font = `bold ${Math.max(9, trackH * 0.22)}px monospace`;
      ctx.fillStyle = "#ffffff88";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("1", trackX - 16, trackY + trackH / 2);
      ctx.fillText("100", trackX + trackW + 18, trackY + trackH / 2);
      ctx.restore();

      // Hazard / bonus tick marks
      for (let i = 1; i < TILES; i++) {
        const x = trackX + i * segW;
        if (i % 11 === 0) {
          ctx.fillStyle = "#fbbf2466";
          ctx.fillRect(x - 0.5, trackY, 1, trackH);
        } else if (i % 7 === 0) {
          ctx.fillStyle = "#ef444466";
          ctx.fillRect(x - 0.5, trackY, 1, trackH);
        }
      }

      // Animate and draw player tokens
      const pList = playersRef.current;
      const aList = animalsRef.current;
      const myId = myIdRef.current;

      pList.forEach((p, idx) => {
        const target = Math.max(0, Math.min(p.position, TILES - 1));
        let cur = animPos.current.get(p.id);
        if (cur === undefined) cur = target;
        cur += (target - cur) * Math.min(1, 6 * dt);
        animPos.current.set(p.id, cur);

        const x = trackX + cur * segW;
        // Offset overlapping tokens vertically
        const sameSpot = pList.filter((q) => Math.abs((animPos.current.get(q.id) ?? 0) - cur) < 1);
        const myIdxInSpot = sameSpot.findIndex((q) => q.id === p.id);
        const yBase = trackY + trackH / 2;
        const yOffset = sameSpot.length > 1 ? (myIdxInSpot - (sameSpot.length - 1) / 2) * (tokenR * 1.8) : 0;
        const y = yBase + yOffset;

        const isMe = p.id === myId;
        const animal = aList.find((a) => a.id === p.animalId);
        const color = animal?.colorPrimary || "#16a34a";

        ctx.save();
        if (isMe) {
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 4;
        }

        // Token circle
        ctx.beginPath();
        ctx.arc(x, y, isMe ? tokenR * 1.25 : tokenR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isMe ? "#fbbf24" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = isMe ? 2.5 : 1.2;
        ctx.stroke();
        ctx.restore();

        // Animal portrait (drawn, no emoji)
        const tr = isMe ? tokenR * 1.25 : tokenR;
        drawAnimalPortrait(ctx, p.animalId, animal?.colorPrimary, undefined, x, y, tr * 0.96);

        // Name tag for "me"
        if (isMe) {
          const nameY = y - tokenR * 1.6;
          ctx.save();
          ctx.font = `bold ${Math.max(9, tokenR * 0.9)}px sans-serif`;
          ctx.textAlign = "center";
          const nw = ctx.measureText(p.name).width;
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.beginPath();
          ctx.roundRect(x - nw / 2 - 4, nameY - 8, nw + 8, 16, 4);
          ctx.fill();
          ctx.fillStyle = "#fde68a";
          ctx.textBaseline = "middle";
          ctx.fillText(p.name, x, nameY);
          ctx.restore();
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const me = players.find((p) => p.id === myPlayerId);
  const sorted = [...players].sort((a, b) => b.ecoScore - a.ecoScore || b.position - a.position);
  const myRank = sorted.findIndex((p) => p.id === myPlayerId) + 1;
  const myZone = me ? getZone(me.position) : null;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Track canvas */}
      <div className="w-full rounded-xl overflow-hidden border border-white/10" style={{ height: 110 }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-xs text-muted-foreground">Tile</div>
          <div className="text-lg font-mono font-bold text-white">{(me?.position ?? 0) + 1}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-xs text-muted-foreground">Rank</div>
          <div className={`text-lg font-bold ${myRank === 1 ? "text-yellow-400" : myRank === 2 ? "text-gray-300" : myRank === 3 ? "text-amber-600" : "text-white"}`}>
            #{myRank}
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-xs text-muted-foreground">Eco Score</div>
          <div className="text-lg font-bold text-primary">{me?.ecoScore ?? 0}</div>
        </div>
      </div>

      {/* Round result feedback */}
      {result && (
        <div className={`rounded-xl p-3 border text-center ${result.correct ? "bg-green-900/40 border-green-500/40" : "bg-red-900/40 border-red-500/40"}`}>
          <div className={`text-base font-bold mb-1 ${result.correct ? "text-green-400" : "text-red-400"}`}>
            {result.correct ? `Correct! +${result.moved} tiles` : "Wrong answer"}
          </div>
          {result.correct && (
            <div className="text-xs text-muted-foreground">Correct: {result.correctOption}</div>
          )}
          {!result.correct && (
            <div className="text-xs text-muted-foreground">Answer: {result.correctOption}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1 italic">{result.explanation}</div>
        </div>
      )}

      {/* Zone indicator */}
      {myZone && (
        <div className="text-center text-xs" style={{ color: myZone.accent }}>
          {myZone.label} Zone · {players.length} players racing
        </div>
      )}
    </div>
  );
}
