import { useEffect, useRef, useCallback } from "react";
import { drawAnimalPortrait } from "../lib/animal-draw";

export interface FinaleWinner {
  name: string;
  animalId: string;
  colorPrimary?: string;
  colorSecondary?: string;
  ecoScore?: number;
}

interface RestorationFinaleProps {
  winner: FinaleWinner;
  onComplete: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function eio(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function phase(elapsed: number, start: number, end: number) { return clamp((elapsed - start) / (end - start), 0, 1); }

function lerpColor(c1: string, c2: string, t: number): string {
  const h2 = (s: string) => {
    const h = s.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = h2(c1);
  const [r2, g2, b2] = h2(c2);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

// ── Sub-draw functions ─────────────────────────────────────────────────────────
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(x + (i - 2) * w * 0.22, y + Math.sin(i * 1.2) * h * 0.2, w * 0.19 + (i === 2 ? w * 0.07 : 0), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHills(ctx: CanvasRenderingContext2D, W: number, H: number, prog: number) {
  ctx.fillStyle = lerpColor("#3d2e12", "#236b1f", prog);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.62);
  ctx.bezierCurveTo(W * 0.2, H * 0.44, W * 0.5, H * 0.47, W, H * 0.54);
  ctx.lineTo(W, H * 0.63);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = lerpColor("#4a3a16", "#2e7a22", prog);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.68);
  ctx.bezierCurveTo(W * 0.3, H * 0.56, W * 0.7, H * 0.58, W, H * 0.63);
  ctx.lineTo(W, H * 0.69);
  ctx.closePath();
  ctx.fill();
}

function drawRiver(ctx: CanvasRenderingContext2D, W: number, H: number, prog: number, t: number) {
  ctx.save();
  ctx.globalAlpha = prog;
  ctx.fillStyle = lerpColor("#2a5a7a", "#38b2e8", prog);
  ctx.beginPath();
  ctx.moveTo(W * 0.38, H * 0.65);
  ctx.bezierCurveTo(W * 0.42, H * 0.7, W * 0.48, H * 0.74, W * 0.53, H * 0.82);
  ctx.bezierCurveTo(W * 0.56, H * 0.9, W * 0.54, H * 0.96, W * 0.5, H);
  ctx.lineTo(W * 0.44, H);
  ctx.bezierCurveTo(W * 0.48, H * 0.94, W * 0.5, H * 0.86, W * 0.45, H * 0.78);
  ctx.bezierCurveTo(W * 0.4, H * 0.7, W * 0.34, H * 0.67, W * 0.32, H * 0.65);
  ctx.closePath();
  ctx.fill();
  if (prog > 0.5) {
    ctx.globalAlpha = (prog - 0.5) / 0.5 * 0.75;
    ctx.fillStyle = "#fff";
    for (let sp = 0; sp < 8; sp++) {
      const p2 = (t * 1.1 + sp * 0.4) % 1;
      ctx.beginPath();
      ctx.arc(W * 0.44 + (sp % 3 - 1) * W * 0.02, H * 0.74 + p2 * H * 0.22, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, h: number, seed: number, t: number, bloomed: boolean) {
  if (h <= 0) return;
  const sw = Math.sin(t * 0.55 + seed) * h * 0.018;
  const tw = h * 0.09;
  // Trunk
  ctx.fillStyle = "#4a2810";
  ctx.fillRect(x - tw / 2 + sw * 0.3, groundY - h * 0.3, tw, h * 0.31);
  // Canopy
  const greens = ["#0d4a1e", "#165e2a", "#1e7a36"];
  ([
    [sw * 0.5, -h * 0.82, h * 0.44],
    [sw * 0.8, -h * 0.64, h * 0.37],
    [sw,       -h * 0.92, h * 0.28],
  ] as [number, number, number][]).forEach(([dx, dy, r], i) => {
    ctx.fillStyle = greens[i];
    ctx.beginPath();
    ctx.arc(x + dx, groundY + dy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  if (bloomed) {
    const fc = ["#f472b6", "#fb7185", "#e879f9", "#fdba74", "#fde68a"];
    for (let fi = 0; fi < 6; fi++) {
      const fa = (fi / 6) * Math.PI * 2;
      ctx.fillStyle = fc[fi % 5];
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(fa) * h * 0.22 + sw,
        groundY - h * 0.78 + Math.sin(fa) * h * 0.11,
        h * 0.063,
        0, Math.PI * 2
      );
      ctx.fill();
    }
  }
}

function drawFlowers(ctx: CanvasRenderingContext2D, W: number, H: number, prog: number, t: number) {
  const colors = ["#f472b6", "#fb923c", "#fbbf24", "#4ade80", "#60a5fa", "#e879f9", "#f87171", "#34d399"];
  const spots: [number, number][] = [
    [0.05, 0.86], [0.11, 0.79], [0.22, 0.89], [0.29, 0.76],
    [0.62, 0.83], [0.72, 0.77], [0.79, 0.89], [0.87, 0.81],
    [0.93, 0.84], [0.14, 0.93], [0.36, 0.91], [0.56, 0.92],
    [0.45, 0.82], [0.67, 0.90],
  ];
  ctx.save();
  spots.forEach(([fx, fy], i) => {
    const delay = (i / spots.length) * 0.65;
    const fp = clamp((prog - delay) / 0.38, 0, 1);
    if (fp <= 0) return;
    const r = Math.min(W, H) * 0.019 * eio(fp);
    const wobble = Math.sin(t * 2.4 + i * 0.85) * r * 0.14;
    // Stem
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = Math.max(1.5, r * 0.19);
    ctx.beginPath();
    ctx.moveTo(W * fx, H * fy + r * 2.2);
    ctx.lineTo(W * fx + wobble, H * fy);
    ctx.stroke();
    // Petals
    const col = colors[i % colors.length];
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      ctx.globalAlpha = fp;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(W * fx + wobble + Math.cos(pa) * r * 0.88, H * fy + Math.sin(pa) * r * 0.88, r * 0.44, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = fp;
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(W * fx + wobble, H * fy, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawSun(ctx: CanvasRenderingContext2D, sx: number, sy: number, prog: number, t: number, W: number) {
  if (prog <= 0) return;
  ctx.save();
  const rayLen = W * 0.38 * prog;
  ctx.globalAlpha = prog * 0.2;
  for (let r = 0; r < 14; r++) {
    const a = (r / 14) * Math.PI * 2 + t * 0.045;
    const x2 = sx + Math.cos(a) * rayLen, y2 = sy + Math.sin(a) * rayLen;
    const rg = ctx.createLinearGradient(sx, sy, x2, y2);
    rg.addColorStop(0, "#fde68a");
    rg.addColorStop(1, "rgba(253,230,138,0)");
    ctx.strokeStyle = rg;
    ctx.lineWidth = Math.max(5, W * 0.022);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.globalAlpha = prog;
  ctx.shadowColor = "#fde68a";
  ctx.shadowBlur = 28;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.065);
  sg.addColorStop(0, "#fffde7");
  sg.addColorStop(0.45, "#fbbf24");
  sg.addColorStop(1, "rgba(251,191,36,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sx, sy, W * 0.065, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, flap: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#1a3028";
  ctx.lineWidth = Math.max(1.5, size * 0.12);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-size, flap * size * 1.1);
  ctx.quadraticCurveTo(0, 0, size, flap * size * 1.1);
  ctx.stroke();
  ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, W: number, H: number, prog: number, t: number, winner: FinaleWinner) {
  ctx.save();
  const slideY = (1 - eio(prog)) * H * -0.22;
  const bH = Math.min(H * 0.2, 130);
  const bY = H * 0.04 + slideY;
  const bX = W * 0.08;
  const bW = W * 0.84;

  ctx.globalAlpha = prog;
  ctx.shadowColor = "#4ade80";
  ctx.shadowBlur = 24;

  const bg = ctx.createLinearGradient(bX, bY, bX + bW, bY + bH);
  bg.addColorStop(0, "#052e16");
  bg.addColorStop(0.5, "#065f46");
  bg.addColorStop(1, "#052e16");
  ctx.fillStyle = bg;
  ctx.beginPath();
  (ctx as any).roundRect(bX, bY, bW, bH, bH * 0.13);
  ctx.fill();
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Shimmer sweep
  const shimX = bX + ((t * 0.55) % 1.3) * bW;
  const shg = ctx.createLinearGradient(shimX - bW * 0.1, 0, shimX + bW * 0.06, 0);
  shg.addColorStop(0, "rgba(255,255,255,0)");
  shg.addColorStop(0.5, "rgba(255,255,255,0.13)");
  shg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.beginPath();
  (ctx as any).roundRect(bX, bY, bW, bH, bH * 0.13);
  ctx.clip();
  ctx.fillStyle = shg;
  ctx.fillRect(bX, bY, bW, bH);
  ctx.restore();

  // Headline
  const fs1 = clamp(bH * 0.32, 18, 48);
  ctx.font = `bold ${fs1}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#4ade80";
  ctx.shadowColor = "#4ade80";
  ctx.shadowBlur = 14;
  ctx.fillText("🌍 RESTORATION COMPLETE!", W / 2, bY + bH * 0.34);

  // Sub-line
  const fs2 = clamp(bH * 0.18, 12, 26);
  ctx.font = `bold ${fs2}px sans-serif`;
  ctx.fillStyle = "#fde68a";
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 8;
  ctx.fillText(`${winner.name} led the way  ·  ${winner.ecoScore ?? 0} eco pts`, W / 2, bY + bH * 0.72);

  ctx.restore();
}

// ── Confetti ───────────────────────────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number; color: string; size: number; rot: number; rotV: number; rect: boolean; }
const CCOLORS = ["#4ade80","#fbbf24","#60a5fa","#f472b6","#34d399","#fb923c","#a78bfa","#f87171"];

// ── Main scene draw ────────────────────────────────────────────────────────────
function drawScene(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  W: number, H: number,
  t: number,
  winner: FinaleWinner,
  confetti: Particle[],
  dt: number,
) {
  // Sky
  const skyP = clamp(phase(elapsed, 1.0, 4.2), 0, 1);
  const sg = ctx.createLinearGradient(0, 0, 0, H * 0.63);
  sg.addColorStop(0, lerpColor("#1a1a2e", "#1565c0", skyP));
  sg.addColorStop(0.55, lerpColor("#2d2d44", "#42a5f5", skyP));
  sg.addColorStop(1, lerpColor("#3d3520", "#b3e5fc", skyP));
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H * 0.63);

  // Clouds
  const cloudP = clamp(phase(elapsed, 2.5, 4.5), 0, 1);
  if (cloudP > 0) {
    ctx.save();
    ctx.globalAlpha = cloudP * 0.9;
    drawCloud(ctx, W * 0.14 + Math.sin(t * 0.07) * W * 0.018, H * 0.1, W * 0.19, H * 0.065);
    drawCloud(ctx, W * 0.67 + Math.sin(t * 0.055 + 1) * W * 0.014, H * 0.07, W * 0.23, H * 0.07);
    drawCloud(ctx, W * 0.42 + Math.sin(t * 0.065 + 2) * W * 0.016, H * 0.17, W * 0.15, H * 0.052);
    ctx.restore();
  }

  // Ground base
  const gP = clamp(phase(elapsed, 1.4, 5.2), 0, 1);
  const gg = ctx.createLinearGradient(0, H * 0.6, 0, H);
  gg.addColorStop(0, lerpColor("#3d2e0a", "#246b18", gP));
  gg.addColorStop(1, lerpColor("#2a1f06", "#143d0e", gP));
  ctx.fillStyle = gg;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  // Ground edge highlight
  ctx.save();
  ctx.globalAlpha = 0.4 + gP * 0.35;
  ctx.strokeStyle = lerpColor("#6b5a20", "#4ade80", gP);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.625);
  ctx.lineTo(W, H * 0.625);
  ctx.stroke();
  ctx.restore();

  // Hills
  drawHills(ctx, W, H, clamp(phase(elapsed, 1.5, 4.6), 0, 1));

  // River
  const riverP = clamp(phase(elapsed, 3.6, 5.8), 0, 1);
  if (riverP > 0) drawRiver(ctx, W, H, riverP, t);

  // Sun
  drawSun(ctx, W * 0.79, H * 0.1, clamp(phase(elapsed, 3.0, 5.2), 0, 1), t, W);

  // Trees
  const treP = clamp(phase(elapsed, 2.4, 5.2), 0, 1);
  if (treP > 0) {
    const treeLayout: [number, number][] = [
      [0.06, 0.21], [0.16, 0.18], [0.7, 0.20], [0.8, 0.23], [0.91, 0.17],
      [0.28, 0.19], [0.57, 0.22],
    ];
    const bloomed = treP > 0.82;
    treeLayout.forEach(([tx, ths], i) => {
      const delay = (i / treeLayout.length) * 0.55;
      const tp = clamp((treP - delay) / (1 - delay), 0, 1);
      if (tp > 0) {
        drawTree(ctx, W * tx, H * 0.635, H * ths * eio(tp), i * 14.3, t, bloomed);
      }
    });
  }

  // Flowers
  const flP = clamp(phase(elapsed, 4.6, 6.8), 0, 1);
  if (flP > 0) drawFlowers(ctx, W, H, flP, t);

  // Birds
  const birdP = clamp(phase(elapsed, 5.6, 8.2), 0, 1);
  if (birdP > 0) {
    const bx = -W * 0.15 + birdP * W * 1.45;
    const by = H * 0.22;
    for (let b = 0; b < 7; b++) {
      const ox = (b % 3) * W * 0.055 - W * 0.055;
      const oy = Math.floor(b / 3) * H * 0.048 + (b % 2) * H * 0.022 + Math.sin(t * 2.3 + b) * H * 0.011;
      drawBird(ctx, bx + ox, by + oy, W * 0.023, Math.sin(t * 5.5 + b * 0.65) * 0.38);
    }
  }

  // Winner animal
  const anP = clamp(phase(elapsed, 6.6, 8.1), 0, 1);
  if (anP > 0) {
    const ax = W * 0.5, ay = H * 0.73;
    const bounce = anP > 0.88 ? 1 + 0.14 * Math.sin((anP - 0.88) / 0.12 * Math.PI) : 1;
    const aR = Math.min(W * 0.11, H * 0.145) * eio(anP) * bounce;

    // Halo glow
    if (anP > 0.35) {
      ctx.save();
      ctx.globalAlpha = (anP - 0.35) / 0.65 * 0.38;
      const hg = ctx.createRadialGradient(ax, ay, 0, ax, ay, aR * 2.0);
      hg.addColorStop(0, (winner.colorPrimary || "#16a34a") + "cc");
      hg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(ax, ay, aR * 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Token
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ax, ay, aR, 0, Math.PI * 2);
    const tg = ctx.createRadialGradient(ax - aR * 0.28, ay - aR * 0.28, 0, ax, ay, aR);
    tg.addColorStop(0, (winner.colorPrimary || "#16a34a") + "ff");
    tg.addColorStop(1, (winner.colorPrimary || "#16a34a") + "99");
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = Math.max(3, aR * 0.055);
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();

    drawAnimalPortrait(ctx, winner.animalId, winner.colorPrimary, winner.colorSecondary, ax, ay, aR * 0.91);

    // Name label
    if (anP > 0.5) {
      const la = (anP - 0.5) / 0.5;
      ctx.save();
      ctx.globalAlpha = la;
      const nfs = clamp(aR * 0.52, 13, 28);
      ctx.font = `bold ${nfs}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const nw = ctx.measureText(winner.name).width;
      const pad = nfs * 0.38;
      const ny = ay + aR + H * 0.018;
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.beginPath();
      (ctx as any).roundRect(ax - nw / 2 - pad, ny - pad * 0.35, nw + pad * 2, nfs + pad * 0.7, nfs * 0.32);
      ctx.fill();
      ctx.fillStyle = "#fde68a";
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 9;
      ctx.fillText(winner.name, ax, ny);
      ctx.restore();
    }
  }

  // Banner
  const bnP = clamp(phase(elapsed, 7.9, 8.7), 0, 1);
  if (bnP > 0) drawBanner(ctx, W, H, bnP, t, winner);

  // Confetti spawn + draw
  if (elapsed > 7.5) {
    const toSpawn = elapsed > 8.5 ? 1 : 4;
    for (let ci = 0; ci < toSpawn && confetti.length < 140; ci++) {
      confetti.push({
        x: Math.random() * W,
        y: -20,
        vx: (Math.random() - 0.5) * W * 0.014,
        vy: H * 0.075 + Math.random() * H * 0.11,
        color: CCOLORS[Math.floor(Math.random() * CCOLORS.length)],
        size: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 7,
        rect: Math.random() < 0.55,
      });
    }
  }
  for (let ci = confetti.length - 1; ci >= 0; ci--) {
    const c = confetti[ci];
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.rotV * dt;
    if (c.y > H + 30) { confetti.splice(ci, 1); continue; }
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    if (c.rect) {
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, c.size / 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Initial black fade-in
  if (elapsed < 0.75) {
    ctx.save();
    ctx.globalAlpha = 1 - elapsed / 0.75;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // End fade to white
  if (elapsed > 8.8) {
    ctx.save();
    ctx.globalAlpha = clamp((elapsed - 8.8) / 0.85, 0, 1);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export function RestorationFinale({ winner, onComplete }: RestorationFinaleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const prevTRef = useRef<number>(0);
  const confettiRef = useRef<Particle[]>([]);
  const doneRef = useRef(false);

  const DURATION = 9.65;

  const handleComplete = useCallback(() => {
    if (!doneRef.current) {
      doneRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    startRef.current = performance.now() / 1000;
    prevTRef.current = startRef.current;
    confettiRef.current = [];
    doneRef.current = false;

    const render = (tsMs: number) => {
      const t = tsMs / 1000;
      const elapsed = t - startRef.current;
      const dt = t - prevTRef.current;
      prevTRef.current = t;

      const W = canvas.offsetWidth || window.innerWidth;
      const H = canvas.offsetHeight || window.innerHeight;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      ctx.clearRect(0, 0, W, H);
      drawScene(ctx, elapsed, W, H, t, winner, confettiRef.current, Math.min(dt, 0.05));

      if (elapsed >= DURATION) {
        handleComplete();
        return;
      }
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [winner, handleComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        touchAction: "none",
        display: "block",
      }}
    />
  );
}
