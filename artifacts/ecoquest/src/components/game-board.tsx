import { useEffect, useRef } from "react";
import { drawAnimalPortrait, drawLightningBolt, drawStar, getBodyPlan } from "../lib/animal-draw";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Animal { id: string; emoji: string; colorPrimary?: string; colorSecondary?: string; }
interface Player { id: string; name: string; animalId: string; position: number; ecoScore?: number; }
export interface HazardEvent { type: string; tileIndex: number; playerId?: string; }
export interface BonusEvent { tileIndex: number; playerId?: string; }
interface GameBoardProps { players: Player[]; animals?: Animal[]; highlightPlayerId?: string; hazardEvent?: HazardEvent | null; bonusEvent?: BonusEvent | null; ecosystemHealth?: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; rotation: number; rotSpeed: number; shape: "leaf" | "circle" | "spark"; }
interface OverlayState { tileIndex: number; type: "hazard" | "bonus"; startT: number; duration: number; }
interface PlayerAnimState { currentTile: number; targetTile: number; moveQueue: number[]; moveLerp: number; bounceTimer: number; movingForward: boolean; stepTimer: number; trailX: number; trailY: number; }
interface CameraState { cx: number; cy: number; zoom: number; tcx: number; tcy: number; tz: number; returnTimer: number; initialized: boolean; followingPlayer: boolean; }
interface PredatorCutscene { predatorType: 'eagle' | 'wolf' | 'tiger'; boardTx: number; boardTy: number; startT: number; duration: number; }

// ── Board constants ───────────────────────────────────────────────────────────
const COLS = 10;
const TILES = 100;
const TOTAL_ROWS = TILES / COLS;
const PAD = 4; // minimal padding so zones fill screen edge-to-edge
const MILESTONES = new Set([9, 19, 29, 39, 49, 59, 69, 79, 89, 99]); // 0-indexed → display as 10,20,...100

// Y-FLIPPED: tile 0 at BOTTOM (start), tile 99 at TOP (finish)
function getTileCenter(i: number, tW: number, tH: number) {
  const logRow = Math.floor(i / COLS);
  const dispRow = (TOTAL_ROWS - 1) - logRow;
  const col = logRow % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS);
  return { x: PAD + col * tW + tW / 2, y: PAD + dispRow * tH + tH / 2 };
}

function isHazard(i: number) { return i > 0 && i % 7 === 0; }
function isBonus(i: number) { return i > 0 && i % 11 === 0 && i % 7 !== 0; }
function eio(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

// ── Drawing primitives ────────────────────────────────────────────────────────

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, seed: number, t: number, flowers = false) {
  const sw = Math.sin(t * 0.65 + seed) * h * 0.018;
  const tw = h * 0.09;
  // trunk
  ctx.fillStyle = "#4a2810";
  ctx.fillRect(x - tw / 2 + sw * 0.3, y - h * 0.28, tw, h * 0.3);
  // three canopy circles – back to front
  const layers = [
    { dx: sw * 0.5, dy: -h * 0.72, r: h * 0.42, c: "#0d4a20" },
    { dx: sw * 0.8, dy: -h * 0.58, r: h * 0.36, c: "#155d2a" },
    { dx: sw, dy: -h * 0.82, r: h * 0.28, c: "#1e7a38" },
  ];
  layers.forEach(({ dx, dy, r, c }) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
  });
  if (flowers) {
    const bc = ["#f472b6", "#fb7185", "#e879f9", "#fdba74", "#fde68a"];
    for (let bi = 0; bi < 7; bi++) {
      const ba = (bi / 7) * Math.PI * 2;
      ctx.fillStyle = bc[bi % 5];
      ctx.beginPath();
      ctx.arc(x + Math.cos(ba) * h * 0.22 + sw, y - h * 0.7 + Math.sin(ba) * h * 0.1, h * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCactus(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.fillStyle = "#2d5c1a";
  const w = h * 0.18;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 5); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - h * 0.3, y - h * 0.62, h * 0.24, w * 0.65, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - h * 0.3, y - h * 0.62 - h * 0.22, w * 0.65, h * 0.22, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + w / 2, y - h * 0.5, h * 0.24, w * 0.65, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + w / 2 + h * 0.24 - w * 0.65, y - h * 0.5 - h * 0.18, w * 0.65, h * 0.18, 4); ctx.fill();
}

function drawButterfly(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, seed: number) {
  const bx = cx + Math.sin(t * 0.9 + seed) * r * 5;
  const by = cy + Math.sin(t * 1.3 + seed * 1.5) * r * 2;
  const flap = Math.sin(t * 5 + seed) * 0.6;
  ctx.save(); ctx.translate(bx, by);
  const cols = ["#f472b6", "#e879f9", "#fb923c"];
  ctx.fillStyle = cols[Math.floor(seed) % 3];
  ctx.save(); ctx.rotate(-flap); ctx.beginPath(); ctx.ellipse(-r * 1.1, 0, r * 1.4, r * 0.65, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.rotate(flap); ctx.beginPath(); ctx.ellipse(r * 1.1, 0, r * 1.4, r * 0.65, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── Zone environment renderers ────────────────────────────────────────────────

function renderForest(ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, t: number) {
  ctx.save();
  // sky-to-forest gradient
  const bg = ctx.createLinearGradient(zx, zy, zx, zy + zh);
  bg.addColorStop(0, "#134d24"); bg.addColorStop(0.45, "#0f3d1c"); bg.addColorStop(1, "#050f07");
  ctx.fillStyle = bg; ctx.fillRect(zx, zy, zw, zh);

  // ambient undergrowth
  ctx.fillStyle = "#0a2912";
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.ellipse(zx + (i / 14) * zw + (i * 43 % 50), zy + zh * 0.72 + (i * 17 % 25), zw * 0.04 + i % 20, zh * 0.06, i * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // far trees (3 depth layers: very small/dark, medium, large/bright)
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 20; i++) drawTree(ctx, zx + (i / 20) * zw + (i * 27 % 30), zy + zh * 0.55 + (i * 13 % 18), zh * (0.28 + (i * 7 % 8) / 40), i * 3.1, t);
  ctx.globalAlpha = 0.65;
  for (let i = 0; i < 12; i++) drawTree(ctx, zx + (i / 12) * zw + (i * 37 % 35), zy + zh * 0.7 + (i * 11 % 15), zh * (0.42 + (i * 9 % 10) / 40), i * 2.3, t);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 7; i++) drawTree(ctx, zx + (i / 7) * zw + (i * 41 % 25), zy + zh * 0.92, zh * (0.62 + (i * 11 % 8) / 25), i * 1.9, t);

  // ground
  const gnd = ctx.createLinearGradient(zx, zy + zh * 0.82, zx, zy + zh);
  gnd.addColorStop(0, "#1a4d0a"); gnd.addColorStop(1, "#070e04");
  ctx.fillStyle = gnd; ctx.fillRect(zx, zy + zh * 0.82, zw, zh * 0.18);

  // floor flowers
  const flc = ["#fde68a", "#fb7185", "#a78bfa", "#86efac"];
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = flc[i % 4];
    ctx.beginPath();
    ctx.arc(zx + (i * 67 % 97) / 97 * zw, zy + zh * 0.75 + (i * 31 % 25) / 100 * zh * 0.22, zh * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }

  // drifting birds (V shapes)
  ctx.globalAlpha = 0.6; ctx.strokeStyle = "#4ade8066"; ctx.lineWidth = Math.max(1, zh * 0.008);
  for (let bi = 0; bi < 4; bi++) {
    const bphase = (t * 0.08 + bi * 0.25) % 1;
    const bx = zx + bphase * zw, by = zy + zh * (0.1 + bi * 0.06);
    ctx.beginPath(); ctx.moveTo(bx - zh * 0.04, by + zh * 0.02); ctx.lineTo(bx, by); ctx.lineTo(bx + zh * 0.04, by + zh * 0.02); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function renderOcean(ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, t: number) {
  ctx.save();
  // sky → deep water gradient
  const bg = ctx.createLinearGradient(zx, zy, zx, zy + zh);
  bg.addColorStop(0, "#93c5fd"); bg.addColorStop(0.18, "#1d4ed8"); bg.addColorStop(0.5, "#1e3a8a"); bg.addColorStop(1, "#0c1a4a");
  ctx.fillStyle = bg; ctx.fillRect(zx, zy, zw, zh);

  // clouds
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  const cloudPositions = [{ x: 0.1, y: 0.06, w: 0.12 }, { x: 0.35, y: 0.08, w: 0.09 }, { x: 0.65, y: 0.05, w: 0.14 }, { x: 0.85, y: 0.09, w: 0.08 }];
  cloudPositions.forEach(({ x, y, w }) => {
    const cx2 = zx + x * zw + Math.sin(t * 0.12) * zw * 0.015;
    const cy2 = zy + y * zh;
    const r = zh * 0.06;
    for (let ci = -1; ci <= 1; ci++) { ctx.beginPath(); ctx.arc(cx2 + ci * r * 1.2, cy2, r * (1 - Math.abs(ci) * 0.25), 0, Math.PI * 2); ctx.fill(); }
  });

  // animated wave crests (surface)
  const surfaceY = zy + zh * 0.19;
  for (let wi = 0; wi < 8; wi++) {
    const wy = surfaceY + wi * zh * 0.025;
    ctx.globalAlpha = 0.22 - wi * 0.02;
    ctx.strokeStyle = wi < 3 ? "#ffffff" : "#93c5fd";
    ctx.lineWidth = Math.max(1.5, zh * 0.018 * (1 - wi * 0.1));
    ctx.beginPath();
    for (let wx = zx; wx <= zx + zw; wx += 4) {
      const cy2 = wy + Math.sin((wx - zx) / zw * Math.PI * 9 + t * 1.8 + wi * 0.6) * zh * 0.015;
      if (wx === zx) ctx.moveTo(wx, cy2); else ctx.lineTo(wx, cy2);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // underwater light rays
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#93c5fd";
  for (let ri = 0; ri < 6; ri++) {
    const rx = zx + (ri / 6) * zw + Math.sin(t * 0.3 + ri) * zw * 0.04;
    ctx.beginPath(); ctx.moveTo(rx - zh * 0.02, surfaceY); ctx.lineTo(rx + zh * 0.02, surfaceY); ctx.lineTo(rx + zh * 0.12, zy + zh); ctx.lineTo(rx - zh * 0.12, zy + zh); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // fish schools
  for (let fi = 0; fi < 6; fi++) {
    const phase = (t * 0.1 + fi * 0.167) % 1;
    const fd = fi % 2 === 0 ? 1 : -1;
    const fx = fd > 0 ? zx + phase * zw : zx + (1 - phase) * zw;
    const fy = zy + zh * (0.35 + fi * 0.08);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#60a5fa";
    for (let ff = 0; ff < 4; ff++) {
      const ox = ff * fd * zh * 0.035, oy = Math.sin(ff * 1.5 + phase * 10) * zh * 0.02;
      ctx.beginPath(); ctx.ellipse(fx + ox, fy + oy, zh * 0.05, zh * 0.025, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx + ox - fd * zh * 0.05, fy + oy); ctx.lineTo(fx + ox - fd * zh * 0.085, fy + oy - zh * 0.022); ctx.lineTo(fx + ox - fd * zh * 0.085, fy + oy + zh * 0.022); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // coral at bottom
  ctx.globalAlpha = 0.55;
  for (let ci = 0; ci < 10; ci++) {
    const cx2 = zx + (ci / 10) * zw + (ci * 47 % 40);
    const cy2 = zy + zh;
    const ch = zh * (0.1 + ci % 3 * 0.04);
    ctx.strokeStyle = ci % 3 === 0 ? "#f97316" : ci % 3 === 1 ? "#a855f7" : "#ec4899";
    ctx.lineWidth = zh * 0.014;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx2, cy2);
    for (let seg = 1; seg <= 4; seg++) ctx.lineTo(cx2 + Math.sin(t * 0.4 + ci + seg * 0.8) * zh * 0.04, cy2 - seg * ch / 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function renderDesert(ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, t: number) {
  ctx.save();
  const bg = ctx.createLinearGradient(zx, zy, zx, zy + zh);
  bg.addColorStop(0, "#f97316"); bg.addColorStop(0.3, "#d97706"); bg.addColorStop(0.65, "#ca8a04"); bg.addColorStop(1, "#92400e");
  ctx.fillStyle = bg; ctx.fillRect(zx, zy, zw, zh);

  // sun
  const sunG = ctx.createRadialGradient(zx + zw * 0.85, zy + zh * 0.12, 0, zx + zw * 0.85, zy + zh * 0.12, zh * 0.22);
  sunG.addColorStop(0, "rgba(254,240,138,0.55)"); sunG.addColorStop(0.5, "rgba(253,224,71,0.18)"); sunG.addColorStop(1, "transparent");
  ctx.fillStyle = sunG; ctx.fillRect(zx, zy, zw, zh);

  // dunes — large sweeping
  for (let di = 0; di < 4; di++) {
    const duneY = zy + (0.3 + di * 0.16) * zh;
    const duneH = zh * (0.18 + di * 0.04);
    ctx.fillStyle = `rgba(${155 + di * 12},${100 + di * 8},${30 + di * 5},${0.5 + di * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(zx, duneY + duneH);
    for (let dx = 0; dx <= zw; dx += 6) ctx.lineTo(zx + dx, duneY + Math.sin(dx / zw * Math.PI * 1.5 + di * 1.1) * duneH * 0.55);
    ctx.lineTo(zx + zw, duneY + duneH); ctx.closePath(); ctx.fill();
  }

  // rock clusters
  ctx.fillStyle = "#7c2d12";
  for (let ri = 0; ri < 14; ri++) {
    const rx = zx + (ri * 73 % 93) / 100 * zw, ry = zy + (ri * 47 % 70) / 100 * zh;
    const rw = zh * (0.04 + ri % 5 * 0.012), rh = zh * (0.03 + ri % 4 * 0.01);
    ctx.beginPath(); ctx.ellipse(rx, ry, rw, rh, ri * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(rx + rw * 0.5, ry + rh * 0.5, rw, rh * 0.3, ri * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7c2d12";
  }

  // cacti — large
  for (let ci = 0; ci < 8; ci++) {
    const cx2 = zx + ((ci * 61 + 7) % 92) / 100 * zw;
    const cy2 = zy + zh * 0.78 + (ci * 17 % 15);
    drawCactus(ctx, cx2, cy2, zh * (0.28 + ci % 4 * 0.06));
  }

  // sand drift particles
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#fde68a";
  for (let si = 0; si < 8; si++) {
    const sp = (t * 0.25 + si * 0.125) % 1;
    ctx.beginPath(); ctx.ellipse(zx + sp * zw, zy + zh * (0.55 + si * 0.04), zh * 0.02, zh * 0.008, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function renderHumanImpact(ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, t: number) {
  ctx.save();
  const bg = ctx.createLinearGradient(zx, zy, zx, zy + zh);
  bg.addColorStop(0, "#0f172a"); bg.addColorStop(0.4, "#1e293b"); bg.addColorStop(1, "#0a0f1a");
  ctx.fillStyle = bg; ctx.fillRect(zx, zy, zw, zh);

  // smog overlay
  ctx.fillStyle = "rgba(75,85,99,0.15)";
  for (let pi = 0; pi < 8; pi++) {
    ctx.beginPath();
    ctx.ellipse(zx + (pi * 79 % 95) / 100 * zw, zy + (pi * 37 % 55) / 100 * zh, zh * 0.25, zh * 0.12, pi * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // toxic ground
  const gnd = ctx.createLinearGradient(zx, zy + zh * 0.8, zx, zy + zh);
  gnd.addColorStop(0, "#1a2a1a"); gnd.addColorStop(1, "#0d1a0d");
  ctx.fillStyle = gnd; ctx.fillRect(zx, zy + zh * 0.82, zw, zh * 0.18);

  // factory complex — several buildings of different heights
  const factories = [
    { x: 0.02, y: 0.3, w: 0.14, h: 0.7, stacks: [0.2, 0.65] },
    { x: 0.19, y: 0.2, w: 0.18, h: 0.8, stacks: [0.15, 0.55, 0.85] },
    { x: 0.41, y: 0.35, w: 0.12, h: 0.65, stacks: [0.35] },
    { x: 0.55, y: 0.25, w: 0.15, h: 0.75, stacks: [0.2, 0.7] },
    { x: 0.74, y: 0.32, w: 0.13, h: 0.68, stacks: [0.4] },
    { x: 0.89, y: 0.38, w: 0.1, h: 0.62, stacks: [0.5] },
  ];
  factories.forEach(f => {
    const fx = zx + f.x * zw, fy = zy + f.y * zh, fw = f.w * zw, fh = f.h * zh;
    // body
    ctx.fillStyle = "#1e293b"; ctx.fillRect(fx, fy, fw, fh);
    // dark metallic edge
    ctx.fillStyle = "#0f172a"; ctx.fillRect(fx, fy, fw * 0.04, fh); ctx.fillRect(fx + fw * 0.96, fy, fw * 0.04, fh);
    // windows (faint yellow)
    ctx.fillStyle = "#fde68a18";
    for (let wi = 0; wi < 4; wi++) for (let hi = 0; hi < 3; hi++) ctx.fillRect(fx + fw * (0.12 + wi * 0.22), fy + fh * (0.15 + hi * 0.28), fw * 0.12, fh * 0.15);
    // stacks
    f.stacks.forEach(sx => {
      const stx = fx + fw * sx, sth = fh * 0.55;
      ctx.fillStyle = "#111827"; ctx.fillRect(stx - fw * 0.055, fy - sth, fw * 0.11, sth);
      // animated smoke
      for (let si = 0; si < 4; si++) {
        const sp = (t * 0.38 + si * 0.25) % 1;
        ctx.globalAlpha = (1 - sp) * 0.45; ctx.fillStyle = si % 2 === 0 ? "#6b7280" : "#4b5563";
        ctx.beginPath(); ctx.arc(stx + Math.sin(sp * 4 + si) * zh * 0.04, fy - sth - sp * zh * 0.55, zh * (0.04 + sp * 0.1), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  });

  // dead trees
  ctx.strokeStyle = "#374151"; ctx.lineWidth = Math.max(2, zh * 0.012); ctx.lineCap = "round";
  [0.37, 0.69, 0.85].forEach(dx => {
    const tx = zx + dx * zw, ty = zy + zh * 0.92;
    const th = zh * 0.42;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - th); ctx.stroke();
    for (let bi = 0; bi < 6; bi++) {
      const ba = (bi % 2 === 0 ? 0.55 : -0.55) + bi * 0.08 - Math.PI * 0.5;
      const bl = zh * (0.06 + bi * 0.015), bby = ty - th * (0.3 + bi * 0.1);
      ctx.beginPath(); ctx.moveTo(tx, bby); ctx.lineTo(tx + Math.cos(ba) * bl, bby + Math.sin(ba) * bl); ctx.stroke();
    }
  });

  // toxic puddles
  ctx.fillStyle = "rgba(74,222,128,0.08)";
  [{ x: 0.3, y: 0.88 }, { x: 0.62, y: 0.9 }, { x: 0.8, y: 0.85 }].forEach(({ x, y }) => {
    ctx.beginPath(); ctx.ellipse(zx + x * zw, zy + y * zh, zw * 0.04, zh * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  });

  // warning/hazard: scattered litter
  ctx.fillStyle = "#6b7280";
  for (let li = 0; li < 8; li++) ctx.fillRect(zx + (li * 79 % 90) / 100 * zw - 4, zy + zh * 0.82 + (li * 31 % 15) - 3, 8, 5);
  ctx.restore();
}

function renderRestoration(ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, t: number) {
  ctx.save();
  const bg = ctx.createLinearGradient(zx, zy, zx, zy + zh);
  bg.addColorStop(0, "#7dd3fc"); bg.addColorStop(0.22, "#0ea5e9"); bg.addColorStop(0.45, "#065f46"); bg.addColorStop(1, "#052e16");
  ctx.fillStyle = bg; ctx.fillRect(zx, zy, zw, zh);

  // sun rays
  const sunRG = ctx.createRadialGradient(zx + zw * 0.75, zy, 0, zx + zw * 0.75, zy, zh * 0.8);
  sunRG.addColorStop(0, "rgba(254,240,138,0.25)"); sunRG.addColorStop(0.4, "rgba(254,240,138,0.06)"); sunRG.addColorStop(1, "transparent");
  ctx.fillStyle = sunRG; ctx.fillRect(zx, zy, zw, zh);

  // wind turbines (on horizon)
  [0.08, 0.92].forEach((tx, ti) => {
    const txx = zx + tx * zw, tyy = zy + zh * 0.32;
    const th = zh * 0.25;
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = Math.max(1, zh * 0.008);
    ctx.beginPath(); ctx.moveTo(txx, tyy); ctx.lineTo(txx, tyy - th); ctx.stroke();
    const ang = t * (ti % 2 === 0 ? 0.4 : -0.4);
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = Math.max(1.5, zh * 0.01);
    for (let bl = 0; bl < 3; bl++) {
      const ba = ang + (bl / 3) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(txx, tyy - th); ctx.lineTo(txx + Math.cos(ba) * th * 0.52, tyy - th + Math.sin(ba) * th * 0.52); ctx.stroke();
    }
  });

  // clean river
  ctx.globalAlpha = 0.42; ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = zh * 0.07; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(zx + zw * 0.25, zy);
  ctx.bezierCurveTo(zx + zw * 0.3, zy + zh * 0.35, zx + zw * 0.46, zy + zh * 0.65, zx + zw * 0.55, zy + zh);
  ctx.stroke();
  // river shimmer
  for (let ri = 0; ri < 4; ri++) {
    const rp = (t * 0.22 + ri * 0.25) % 1;
    ctx.globalAlpha = (1 - rp) * 0.22; ctx.fillStyle = "#bae6fd";
    ctx.beginPath(); ctx.ellipse(zx + zw * (0.28 + rp * 0.24), zy + rp * zh, zh * 0.025, zh * 0.012, 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ground
  const gnd = ctx.createLinearGradient(zx, zy + zh * 0.5, zx, zy + zh);
  gnd.addColorStop(0, "#15803d"); gnd.addColorStop(1, "#052e16");
  ctx.fillStyle = gnd; ctx.fillRect(zx, zy + zh * 0.5, zw, zh * 0.5);

  // far trees
  ctx.globalAlpha = 0.45;
  for (let ti = 0; ti < 12; ti++) drawTree(ctx, zx + (ti / 12) * zw + (ti * 33 % 30), zy + zh * 0.62 + (ti * 13 % 12), zh * (0.3 + (ti * 9 % 8) / 35), ti * 2.1, t, true);
  ctx.globalAlpha = 1;
  for (let ti = 0; ti < 7; ti++) drawTree(ctx, zx + (ti / 7) * zw + (ti * 27 % 25), zy + zh * 0.78, zh * (0.42 + (ti * 11 % 8) / 28), ti * 1.7, t, true);

  // wildflowers
  const fc = ["#fde68a", "#fb7185", "#a78bfa", "#86efac", "#fdba74", "#c4b5fd"];
  for (let fi = 0; fi < 30; fi++) {
    ctx.fillStyle = fc[fi % 6];
    ctx.beginPath();
    ctx.arc(zx + (fi * 59 % 99) / 99 * zw, zy + zh * 0.65 + (fi * 43 % 30) / 100 * zh * 0.32, zh * 0.013, 0, Math.PI * 2);
    ctx.fill();
  }

  // butterflies
  for (let bi = 0; bi < 5; bi++) drawButterfly(ctx, zx + zw * (0.1 + bi * 0.2), zy + zh * 0.42, zh * 0.025, t, bi * 2.1);

  // birds at top
  ctx.globalAlpha = 0.55; ctx.strokeStyle = "#0369a1"; ctx.lineWidth = Math.max(1.5, zh * 0.01);
  for (let bi = 0; bi < 5; bi++) {
    const bp = (t * 0.1 + bi * 0.2) % 1;
    const bx = zx + bp * zw, by = zy + zh * (0.05 + bi * 0.035);
    ctx.beginPath(); ctx.moveTo(bx - zh * 0.035, by + zh * 0.015); ctx.lineTo(bx, by); ctx.lineTo(bx + zh * 0.035, by + zh * 0.015); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Nature trail ──────────────────────────────────────────────────────────────
function drawNaturePath(ctx: CanvasRenderingContext2D, centers: { x: number; y: number }[], tW: number, tH: number) {
  const pW = Math.max(8, Math.min(tW, tH) * 0.52); // LARGE path width

  const segs = [
    { s: 0, e: 20, trail: "#7C5029", edge: "#3D1e08" },
    { s: 19, e: 40, trail: "#2A5A9A", edge: "#0c1a40" },
    { s: 39, e: 60, trail: "#C4943A", edge: "#7A5010" },
    { s: 59, e: 80, trail: "#3a3a3a", edge: "#111111" },
    { s: 79, e: 100, trail: "#4A7C22", edge: "#2a4d10" },
  ];

  segs.forEach(seg => {
    const pts: { x: number; y: number }[] = [];
    for (let i = seg.s; i <= seg.e && i < centers.length; i++) pts.push(centers[i]);
    if (pts.length < 2) return;

    // outer shadow
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 8;
    ctx.strokeStyle = seg.edge; ctx.lineWidth = pW + 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
    ctx.restore();

    // main trail
    ctx.strokeStyle = seg.trail; ctx.lineWidth = pW; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();

    // surface highlight
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = pW * 0.25;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
  });

  // ocean wooden plank marks
  ctx.save(); ctx.strokeStyle = "rgba(90,60,25,0.25)"; ctx.lineWidth = Math.max(1, tH * 0.015);
  for (let pi = 19; pi < 40 && pi < centers.length - 1; pi++) {
    const c = centers[pi], nc = centers[pi + 1];
    const dx = nc.x - c.x, dy = nc.y - c.y;
    const len = Math.sqrt(dx * dx + dy * dy); if (len < 1) continue;
    const px = -dy / len, py = dx / len;
    const np = Math.max(1, Math.floor(len / (pW * 0.55)));
    for (let pk = 0; pk <= np; pk++) {
      const f = pk / Math.max(1, np), mx = c.x + dx * f, my = c.y + dy * f;
      ctx.beginPath(); ctx.moveTo(mx + px * pW * 0.52, my + py * pW * 0.52); ctx.lineTo(mx - px * pW * 0.52, my - py * pW * 0.52); ctx.stroke();
    }
  }
  ctx.restore();

  // desert cracked asphalt lines
  ctx.save(); ctx.strokeStyle = "rgba(255,220,80,0.2)"; ctx.lineWidth = Math.max(1, tH * 0.008); ctx.setLineDash([tW * 0.3, tW * 0.2]);
  ctx.beginPath();
  for (let i = 39; i <= 60 && i < centers.length; i++) {
    if (i === 39) ctx.moveTo(centers[i].x, centers[i].y); else ctx.lineTo(centers[i].x, centers[i].y);
  }
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

// ── Waypoints (milestones + hazard/bonus auras) ───────────────────────────────
function drawWaypoints(ctx: CanvasRenderingContext2D, centers: { x: number; y: number }[], tW: number, tH: number, t: number) {
  const mR = Math.min(tW, tH) * 0.26; // milestone circle radius — large and visible
  const aR = Math.min(tW, tH) * 0.18; // aura for hazard/bonus
  const zoneAcc = ["#22c55e", "#3b82f6", "#f59e0b", "#9ca3af", "#4ade80"];
  const fontSize = Math.max(10, mR * 0.72);

  for (let i = 0; i < TILES; i++) {
    const c = centers[i];
    const isStart = i === 0, isFinish = i === TILES - 1;
    const isMilestone = MILESTONES.has(i) || isStart || isFinish;
    const hz = isHazard(i), bn = isBonus(i);

    // Hazard/bonus aura (always visible, no label)
    if (hz) {
      const pulse = 1 + 0.1 * Math.sin(t * 2.8 + i);
      ctx.save(); ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 12;
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = Math.max(2, tH * 0.025);
      ctx.globalAlpha = 0.7 + 0.15 * Math.sin(t * 2.5 + i);
      ctx.beginPath(); ctx.arc(c.x, c.y, aR * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      if (!isMilestone) drawLightningBolt(ctx, c.x, c.y, aR * 0.7, "#fca5a5");
    } else if (bn) {
      const pulse = 1 + 0.08 * Math.sin(t * 2.2 + i);
      ctx.save(); ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 12;
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = Math.max(2, tH * 0.025);
      ctx.globalAlpha = 0.7 + 0.15 * Math.sin(t * 2 + i);
      ctx.beginPath(); ctx.arc(c.x, c.y, aR * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      if (!isMilestone) drawStar(ctx, c.x, c.y, aR * 0.7, "#fde68a");
    }

    // Milestone markers (only at 10, 20, 30 ... 100 + start)
    if (!isMilestone) continue;

    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    if (isStart) {
      ctx.save(); ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 20;
      ctx.fillStyle = "#052e16"; ctx.beginPath(); ctx.arc(c.x, c.y, mR * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#4ade80"; ctx.lineWidth = Math.max(2, tH * 0.025); ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#4ade80"; ctx.font = `bold ${fontSize * 0.85}px sans-serif`; ctx.fillText("START", c.x, c.y);
    } else if (isFinish) {
      ctx.save(); ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 22;
      ctx.fillStyle = "#451a03"; ctx.beginPath(); ctx.arc(c.x, c.y, mR * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = Math.max(2, tH * 0.028); ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#fde68a"; ctx.font = `bold ${fontSize}px sans-serif`; ctx.fillText("100", c.x, c.y - fontSize * 0.4);
      ctx.font = `${fontSize * 0.6}px sans-serif`; ctx.fillText("FINISH", c.x, c.y + fontSize * 0.52);
    } else {
      const zi = Math.min(4, Math.floor(i / 20));
      const acc = hz ? "#ef4444" : bn ? "#fbbf24" : zoneAcc[zi];
      ctx.save(); ctx.shadowColor = acc; ctx.shadowBlur = 14;
      ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.arc(c.x, c.y, mR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(2, tH * 0.02); ctx.stroke(); ctx.restore();
      ctx.fillStyle = acc; ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillText(String(i + 1), c.x, c.y);
      if (hz) drawLightningBolt(ctx, c.x, c.y, mR * 0.65, "#fca5a5");
      else if (bn) drawStar(ctx, c.x, c.y, mR * 0.65, "#fde68a");
    }
  }
}

// ── Particles ─────────────────────────────────────────────────────────────────
function spawnParticle(cx: number, cy: number, zone: number, tW: number): Particle {
  const x = cx + (Math.random() - 0.5) * tW * 2.5;
  const y = cy + (Math.random() - 0.5) * tW * 2.5;
  const life = 2.5 + Math.random() * 2;
  if (zone === 0) return { x, y, vx: (Math.random() - 0.5) * 8, vy: -5 - Math.random() * 5, life, maxLife: life, color: Math.random() < 0.5 ? "#4ade80" : "#86efac", size: 3 + Math.random() * 3, rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 4, shape: "leaf" };
  if (zone === 1) return { x, y, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2, life, maxLife: life, color: "#93c5fd", size: 2 + Math.random() * 2, rotation: 0, rotSpeed: 0, shape: "circle" };
  if (zone === 2) return { x, y, vx: 5 + Math.random() * 6, vy: (Math.random() - 0.5) * 2, life: 0.8 + Math.random() * 1.2, maxLife: life, color: "#fde68a", size: 1.5 + Math.random() * 2, rotation: 0, rotSpeed: 0, shape: "circle" };
  if (zone === 3) return { x, y, vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 2, life: 1.5 + Math.random() * 2, maxLife: life, color: "#4b5563", size: 4 + Math.random() * 4, rotation: 0, rotSpeed: 0, shape: "circle" };
  return { x, y, vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 4, life, maxLife: life, color: Math.random() < 0.5 ? "#a3e635" : "#fbbf24", size: 2 + Math.random() * 3, rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 6, shape: "spark" };
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function drawOverlay(ctx: CanvasRenderingContext2D, overlay: OverlayState, elapsed: number, centers: { x: number; y: number }[], tH: number) {
  const c = centers[Math.max(0, Math.min(overlay.tileIndex, TILES - 1))];
  const prog = elapsed / overlay.duration;
  const alpha = Math.min(1, prog / 0.15) * (prog > 0.7 ? 1 - (prog - 0.7) / 0.3 : 1);
  const maxR = tH * 1.8;
  ctx.save();
  if (overlay.type === "hazard") {
    for (let ring = 0; ring < 4; ring++) {
      const rp = (prog * 1.4 + ring * 0.25) % 1;
      ctx.globalAlpha = (1 - rp) * alpha * 0.6;
      ctx.beginPath(); ctx.arc(c.x, c.y, rp * maxR, 0, Math.PI * 2);
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = Math.max(3, tH * 0.04); ctx.stroke();
    }
    ctx.globalAlpha = alpha * 0.2;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, maxR * 0.7);
    g.addColorStop(0, "#ef4444"); g.addColorStop(1, "rgba(239,68,68,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, maxR * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha * 0.7; ctx.strokeStyle = "#fca5a5"; ctx.lineWidth = Math.max(2, tH * 0.02);
    for (let bolt = 0; bolt < 8; bolt++) {
      const ba = (bolt / 8) * Math.PI * 2 + prog * 0.6, bl = maxR * (0.4 + prog * 0.5);
      ctx.beginPath(); ctx.moveTo(c.x, c.y);
      for (let s = 1; s <= 3; s++) { const f = s / 3; ctx.lineTo(c.x + Math.cos(ba) * bl * f + (Math.random() - 0.5) * bl * 0.25, c.y + Math.sin(ba) * bl * f + (Math.random() - 0.5) * bl * 0.25); }
      ctx.stroke();
    }
  } else {
    for (let ring = 0; ring < 3; ring++) {
      const rp = (prog * 1.2 + ring * 0.33) % 1;
      ctx.globalAlpha = (1 - rp) * alpha * 0.55;
      ctx.beginPath(); ctx.arc(c.x, c.y, rp * maxR * 0.9, 0, Math.PI * 2);
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = Math.max(2, tH * 0.03); ctx.stroke();
    }
    ctx.globalAlpha = alpha * 0.25;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, maxR * 0.7);
    g.addColorStop(0, "#fde68a"); g.addColorStop(1, "rgba(253,230,138,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, maxR * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha * 0.85; ctx.fillStyle = "#fbbf24";
    for (let sp = 0; sp < 12; sp++) {
      const sa = (sp / 12) * Math.PI * 2 + prog * 1.2, sd = maxR * (0.3 + prog * 0.6);
      ctx.save(); ctx.translate(c.x + Math.cos(sa) * sd, c.y + Math.sin(sa) * sd); ctx.rotate(sa + prog * 2);
      const sr = Math.max(3, tH * 0.05) * (1 - prog * 0.5);
      ctx.beginPath();
      for (let pt = 0; pt < 4; pt++) { const pa = (pt / 4) * Math.PI * 2, pr = pt % 2 === 0 ? sr : sr * 0.38; if (pt === 0) ctx.moveTo(Math.cos(pa) * pr, Math.sin(pa) * pr); else ctx.lineTo(Math.cos(pa) * pr, Math.sin(pa) * pr); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
}

// ── Predator Drawing Functions ────────────────────────────────────────────────

function drawEagleShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, wingFold: number, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(sz / 60, sz / 60);
  const ws = 60 * (1 - wingFold * 0.78);
  // Shadow on ground
  ctx.save(); ctx.globalAlpha *= 0.22; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(2, 32 * (1 - wingFold * 0.5), 40 * (1 - wingFold * 0.6), 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // Left wing
  ctx.fillStyle = '#1a0f00';
  ctx.beginPath(); ctx.moveTo(-5, 0);
  ctx.bezierCurveTo(-18, -ws * 0.38, -ws, -ws * 0.52, -ws * 0.92, ws * 0.14);
  ctx.bezierCurveTo(-ws * 0.5, ws * 0.1, -12, ws * 0.06, -5, 5); ctx.closePath(); ctx.fill();
  // Right wing
  ctx.beginPath(); ctx.moveTo(-5, 0);
  ctx.bezierCurveTo(-18, ws * 0.38, -ws, ws * 0.52, -ws * 0.92, -ws * 0.14);
  ctx.bezierCurveTo(-ws * 0.5, -ws * 0.1, -12, -ws * 0.06, -5, -5); ctx.closePath(); ctx.fill();
  // Body
  ctx.fillStyle = '#2d1a00';
  ctx.beginPath(); ctx.ellipse(0, 0, 28, 11, 0, 0, Math.PI * 2); ctx.fill();
  // White head (bald eagle)
  ctx.fillStyle = '#f0ede0';
  ctx.beginPath(); ctx.arc(24, 0, 12, 0, Math.PI * 2); ctx.fill();
  // White tail
  ctx.fillStyle = '#f0ede0';
  ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-38, -9); ctx.lineTo(-38, 9); ctx.closePath(); ctx.fill();
  // Eye
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(30, -2, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(30.5, -2, 2, 0, Math.PI * 2); ctx.fill();
  // Beak
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath(); ctx.moveTo(34, -1); ctx.lineTo(44, 2); ctx.lineTo(35, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawWolfShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, runPhase: number, _facingRight: boolean) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sz / 60, sz / 60);
  const lb = Math.sin(runPhase * Math.PI * 2) * 16;
  // Body
  ctx.fillStyle = '#4a4040';
  ctx.beginPath(); ctx.ellipse(0, 0, 32, 15, -0.12, 0, Math.PI * 2); ctx.fill();
  // Tail
  ctx.strokeStyle = '#3a3030'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-28, 0); ctx.quadraticCurveTo(-50, -18, -54, -40); ctx.stroke();
  // Legs
  ctx.strokeStyle = '#3a3030'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(28 + lb * 0.5, 28); ctx.lineTo(22 + lb, 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, 12); ctx.lineTo(14 - lb * 0.5, 28); ctx.lineTo(8 - lb, 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-20, 10); ctx.lineTo(-28 - lb * 0.5, 26); ctx.lineTo(-22 - lb, 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(-6 + lb * 0.5, 26); ctx.lineTo(-2 + lb, 38); ctx.stroke();
  // Head
  ctx.fillStyle = '#5a4f4f';
  ctx.beginPath(); ctx.ellipse(36, -10, 18, 14, 0.28, 0, Math.PI * 2); ctx.fill();
  // Ears
  ctx.fillStyle = '#3a3030';
  ctx.beginPath(); ctx.moveTo(28, -22); ctx.lineTo(24, -40); ctx.lineTo(38, -28); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(40, -22); ctx.lineTo(40, -38); ctx.lineTo(52, -26); ctx.closePath(); ctx.fill();
  // Snout
  ctx.fillStyle = '#6e6060'; ctx.beginPath(); ctx.ellipse(48, -6, 10, 8, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.ellipse(54, -5, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Eye
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(42, -13, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(43, -13, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTigerShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, crouchAmt: number, elapsed: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sz / 60, sz / 60);
  const dy = crouchAmt * 10;
  // Body
  ctx.fillStyle = '#c2560a';
  ctx.beginPath(); ctx.ellipse(0, dy, 36, 18 - crouchAmt * 5, -0.1, 0, Math.PI * 2); ctx.fill();
  // Stripes
  ctx.strokeStyle = '#7a2c00'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let s = 0; s < 5; s++) { const sx = (s - 2) * 12; ctx.beginPath(); ctx.moveTo(sx, dy - 17); ctx.lineTo(sx + 4, dy + 17); ctx.stroke(); }
  // Tail
  ctx.strokeStyle = '#c2560a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-32, dy + 6); ctx.quadraticCurveTo(-55, dy - 12, -58, dy - 36 + Math.sin(elapsed * 3) * 8); ctx.stroke();
  ctx.strokeStyle = '#1a0a00'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-54, dy - 32 + Math.sin(elapsed * 3) * 8); ctx.lineTo(-64, dy - 42 + Math.sin(elapsed * 3) * 8); ctx.stroke();
  // Legs
  ctx.strokeStyle = '#b24c08'; ctx.lineWidth = 12;
  const ld = crouchAmt * 6;
  ctx.beginPath(); ctx.moveTo(22, dy + 14); ctx.lineTo(18, dy + 34 + ld); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, dy + 16); ctx.lineTo(4, dy + 36 + ld); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-22, dy + 14); ctx.lineTo(-24, dy + 34 + ld); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, dy + 16); ctx.lineTo(-12, dy + 36 + ld); ctx.stroke();
  // Head
  ctx.fillStyle = '#d4620c'; ctx.beginPath(); ctx.ellipse(38, dy - 12, 22, 18, 0.2, 0, Math.PI * 2); ctx.fill();
  // Ears
  ctx.fillStyle = '#b24c08';
  ctx.beginPath(); ctx.moveTo(28, dy - 26); ctx.lineTo(22, dy - 42); ctx.lineTo(38, dy - 28); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(44, dy - 26); ctx.lineTo(44, dy - 42); ctx.lineTo(56, dy - 28); ctx.closePath(); ctx.fill();
  // Face
  ctx.fillStyle = '#f5c9a0'; ctx.beginPath(); ctx.ellipse(42, dy - 8, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(34, dy - 17, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(34.5, dy - 17, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(46, dy - 17, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(46.5, dy - 17, 2.8, 0, Math.PI * 2); ctx.fill();
  // Nose
  ctx.fillStyle = '#e05a7a'; ctx.beginPath(); ctx.arc(42, dy - 3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPredatorCutscene(
  ctx: CanvasRenderingContext2D,
  scene: PredatorCutscene,
  elapsed: number,
  W: number, H: number, tH: number,
  zoom: number, cx: number, cy: number,
) {
  const prog = Math.min(1, elapsed / scene.duration);
  // Convert board target to screen space
  const stx = scene.boardTx * zoom + W / 2 - cx * zoom;
  const sty = scene.boardTy * zoom + H / 2 - cy * zoom;
  const sz = Math.max(44, H * 0.17) * zoom;

  // Vignette / dim
  const dimA = Math.min(1, prog / 0.1) * (prog > 0.86 ? Math.max(0, 1 - (prog - 0.86) / 0.14) : 1) * 0.6;
  ctx.save(); ctx.globalAlpha = dimA; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();

  // HAZARD banner
  const bannerA = Math.min(1, prog / 0.08) * (prog > 0.68 ? Math.max(0, 1 - (prog - 0.68) / 0.16) : 1);
  if (bannerA > 0) {
    ctx.save(); ctx.globalAlpha = bannerA;
    const bh = Math.max(22, H * 0.075), bfs = Math.max(14, H * 0.05);
    ctx.fillStyle = 'rgba(185,18,18,0.92)';
    ctx.beginPath(); ctx.roundRect(W / 2 - bh * 3.2, H * 0.07 - bh * 0.5, bh * 6.4, bh, bh * 0.22); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 18;
    ctx.font = `bold ${bfs}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚠  HAZARD!', W / 2, H * 0.07); ctx.restore();
  }

  // ── Eagle cutscene ──────────────────────────────────────────────────────────
  if (scene.predatorType === 'eagle') {
    let ex: number, ey: number, angle: number, wingFold: number, alpha = 1;
    if (prog < 0.33) {
      const p = eio(prog / 0.33);
      ex = W * 1.12 + (stx - W * 1.12) * p; ey = -H * 0.12 + (sty - sz * 1.6 - (-H * 0.12)) * p;
      angle = Math.atan2(sty - sz - (-H * 0.12), stx - W * 1.12) * 0.35; wingFold = 0.07;
    } else if (prog < 0.62) {
      const p = eio((prog - 0.33) / 0.29);
      const sx0 = stx - W * 0.1, sy0 = sty - sz * 1.5;
      ex = sx0 + (stx - sx0) * p; ey = sy0 + (sty - sz * 0.35 - sy0) * p;
      angle = -0.55 + p * 0.35; wingFold = 0.06 + p * 0.9;
    } else if (prog < 0.73) {
      const p = (prog - 0.62) / 0.11;
      ex = stx; ey = sty - sz * 0.35; angle = -0.2; wingFold = 0.96; alpha = 1 - p * 0.25;
      // Flash
      ctx.save(); ctx.globalAlpha = (1 - p) * 0.75;
      ctx.fillStyle = '#fff8d0'; ctx.beginPath(); ctx.arc(stx, sty, sz * (1 + p * 2.8), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // Shockwave rings
      for (let r = 0; r < 3; r++) {
        const rp = (p + r * 0.3) % 1;
        ctx.save(); ctx.globalAlpha = (1 - rp) * 0.65; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = Math.max(2, H * 0.004);
        ctx.beginPath(); ctx.arc(stx, sty, sz * 0.45 + rp * sz * 2.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      // Claw marks
      ctx.save(); ctx.globalAlpha = (1 - p) * 0.9; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = Math.max(2, H * 0.005); ctx.lineCap = 'round';
      for (let c2 = 0; c2 < 3; c2++) {
        const ca = -0.45 + c2 * 0.38;
        ctx.beginPath(); ctx.moveTo(stx + Math.cos(ca) * sz * 0.12, sty + Math.sin(ca) * sz * 0.12);
        ctx.lineTo(stx + Math.cos(ca) * sz * 0.72, sty + Math.sin(ca + 0.75) * sz * 0.56); ctx.stroke();
      }
      ctx.restore();
    } else {
      const p = eio((prog - 0.73) / 0.27);
      ex = stx + (W * 1.1 - stx) * p; ey = sty - sz * 0.35 + (-H * 0.12 - (sty - sz * 0.35)) * p;
      angle = -0.35 - p * 0.1; wingFold = 0.96 * (1 - p * 0.88); alpha = 1 - p * 0.9;
    }
    ctx.save(); ctx.globalAlpha = alpha; drawEagleShape(ctx, ex, ey, sz, wingFold, angle); ctx.restore();
  }

  // ── Wolf cutscene ───────────────────────────────────────────────────────────
  if (scene.predatorType === 'wolf') {
    let wx: number, wy = sty - sz * 0.5, runPhase: number, alpha = 1;
    if (prog < 0.38) {
      const p = eio(prog / 0.38);
      wx = -sz + (stx - sz * 1.2 - (-sz)) * p; runPhase = p * 3;
    } else if (prog < 0.64) {
      const p = (prog - 0.38) / 0.26;
      wx = stx - sz * 0.8 + p * sz * 0.6; wy = sty - sz * 0.5 - p * sz * 0.32; runPhase = 0.5;
      if (p > 0.65) {
        const ip = (p - 0.65) / 0.35;
        ctx.save(); ctx.globalAlpha = (1 - ip) * 0.62; ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(stx, sty, sz * (0.55 + ip * 1.9), 0, Math.PI * 2); ctx.fill(); ctx.restore();
        for (let r = 0; r < 3; r++) {
          const rp = (ip + r * 0.3) % 1;
          ctx.save(); ctx.globalAlpha = (1 - rp) * 0.55; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = Math.max(2, H * 0.004);
          ctx.beginPath(); ctx.arc(stx, sty, sz * 0.45 + rp * sz * 2.1, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
      }
    } else {
      const p = eio((prog - 0.64) / 0.36);
      wx = stx + (W + sz - stx) * p; runPhase = p * 4; alpha = 1 - p * 0.88;
    }
    ctx.save(); ctx.globalAlpha = alpha; drawWolfShape(ctx, wx, wy, sz, runPhase, true); ctx.restore();
  }

  // ── Tiger cutscene ──────────────────────────────────────────────────────────
  if (scene.predatorType === 'tiger') {
    let tx2 = stx, ty2 = sty - sz * 0.5, crouchAmt = 0, alpha = 1;
    if (prog < 0.3) {
      const p = prog / 0.3; alpha = p;
      // Grass covers emergence
      ctx.save(); ctx.globalAlpha = 1 - p * 0.85;
      ctx.fillStyle = '#15571a'; ctx.fillRect(stx - sz * 1.3, sty - sz * (1 - p * 0.3), sz * 2.6, sz * (1 - p * 0.3)); ctx.restore();
    } else if (prog < 0.6) {
      const p = (prog - 0.3) / 0.3;
      crouchAmt = Math.sin(p * Math.PI); ty2 = sty - sz * 0.5 - p * sz * 0.3; tx2 = stx - sz * 0.2 + p * sz * 0.4;
    } else if (prog < 0.73) {
      const p = (prog - 0.6) / 0.13;
      ty2 = sty - sz * 0.08; crouchAmt = 0.1; tx2 = stx;
      ctx.save(); ctx.globalAlpha = (1 - p) * 0.68; ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(stx, sty, sz * (1 + p * 2.1), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      for (let r = 0; r < 4; r++) {
        const rp = (p + r * 0.25) % 1;
        ctx.save(); ctx.globalAlpha = (1 - rp) * 0.52; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = Math.max(2, H * 0.004);
        ctx.beginPath(); ctx.arc(stx, sty, sz * 0.35 + rp * sz * 2.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    } else {
      const p = eio((prog - 0.73) / 0.27);
      tx2 = stx + p * sz * 0.6; ty2 = sty - sz * 0.08 + p * sz * 1.1; alpha = 1 - p * 0.9;
      ctx.save(); ctx.globalAlpha = p * 0.88; ctx.fillStyle = '#15571a';
      ctx.fillRect(stx - sz * 1.3, sty - sz * p, sz * 2.6, sz * p); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = alpha; drawTigerShape(ctx, tx2, ty2, sz, crouchAmt, elapsed); ctx.restore();
  }
}

// ── Ecosystem Health Meter ────────────────────────────────────────────────────
function drawEcosystemMeter(ctx: CanvasRenderingContext2D, health: number, W: number, H: number, t: number) {
  const mW = Math.max(26, W * 0.025);
  const mH = H * 0.52;
  const mx = 14;
  const my = H * 0.24;
  const br = mW / 2;

  // Panel
  ctx.save();
  ctx.shadowColor = health > 60 ? '#16a34a' : health > 30 ? '#f59e0b' : '#ef4444';
  ctx.shadowBlur = 10; ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(4,10,4,0.93)';
  ctx.beginPath(); ctx.roundRect(mx - 5, my - 38, mW + 10, mH + 56, br + 5); ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = health > 60 ? '#4ade80' : health > 30 ? '#f59e0b' : '#ef4444';
  ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  // Globe emoji label
  const labelFs = Math.max(8, mW * 0.55);
  ctx.save();
  ctx.font = `${labelFs}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🌍', mx + mW / 2, my - 24);
  ctx.restore();

  // Bar track
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.roundRect(mx, my, mW, mH, br); ctx.fill(); ctx.restore();

  // Fill gradient
  const fillH = mH * Math.max(0, Math.min(1, health / 100));
  const fillY = my + mH - fillH;
  if (fillH > 1) {
    const g = ctx.createLinearGradient(0, my + mH, 0, my);
    g.addColorStop(0, '#7f1d1d'); g.addColorStop(0.25, '#ef4444');
    g.addColorStop(0.5, '#f59e0b'); g.addColorStop(0.75, '#16a34a'); g.addColorStop(1, '#4ade80');
    ctx.save();
    ctx.beginPath(); ctx.roundRect(mx, my, mW, mH, br); ctx.clip();
    ctx.fillStyle = g; ctx.fillRect(mx, fillY, mW, fillH);
    ctx.restore();

    // Glow dot at fill level
    const gc = health > 60 ? '#86efac' : health > 30 ? '#fde68a' : '#fca5a5';
    ctx.save();
    ctx.globalAlpha = 0.8 + 0.18 * Math.sin(t * 2.8);
    ctx.shadowColor = gc; ctx.shadowBlur = 14;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(mx + mW / 2, fillY + 2, Math.max(3, mW * 0.27), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Tick marks
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
  for (let ti = 1; ti < 4; ti++) {
    const ty2 = my + mH * (1 - ti * 0.25);
    ctx.beginPath(); ctx.moveTo(mx + 3, ty2); ctx.lineTo(mx + mW - 3, ty2); ctx.stroke();
  }
  ctx.restore();

  // % label
  ctx.save();
  const pctFs = Math.max(7, mW * 0.32);
  ctx.font = `bold ${pctFs}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const pc = health > 60 ? '#4ade80' : health > 30 ? '#f59e0b' : '#ef4444';
  ctx.fillStyle = pc; ctx.shadowColor = pc; ctx.shadowBlur = 6;
  ctx.fillText(`${Math.round(health)}%`, mx + mW / 2, my + mH + 20);
  ctx.restore();

  // Ascending sparkles when healthy
  if (health > 68) {
    for (let si = 0; si < 4; si++) {
      const sp = ((t * 0.65 + si * 0.25) % 1);
      const sx = mx + mW / 2 + Math.sin(t * 1.5 + si * 2.2) * mW * 0.95;
      const sy = my - 8 - sp * 30;
      ctx.save();
      ctx.globalAlpha = sp < 0.5 ? sp * 2 * 0.8 : (1 - sp) * 2 * 0.8;
      ctx.fillStyle = '#86efac'; ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(1.5, mW * 0.1), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // Pulsing danger border
  if (health < 25) {
    ctx.save();
    ctx.globalAlpha = 0.42 + 0.42 * Math.abs(Math.sin(t * 3.5));
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.roundRect(mx - 3, my - 3, mW + 6, mH + 6, br + 3); ctx.stroke();
    ctx.restore();
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export function GameBoard({ players, animals = [], highlightPlayerId, hazardEvent, bonusEvent, ecosystemHealth }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const playersRef = useRef<Player[]>([]);
  const animalsRef = useRef<Animal[]>([]);
  const highlightRef = useRef<string | undefined>(undefined);
  const overlayRef = useRef<OverlayState | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animState = useRef<Map<string, PlayerAnimState>>(new Map());
  const cameraRef = useRef<CameraState>({ cx: 0, cy: 0, zoom: 1, tcx: 0, tcy: 0, tz: 1, returnTimer: 0, initialized: false, followingPlayer: false });
  const predatorRef = useRef<PredatorCutscene | null>(null);
  const ecoHealthRef = useRef<number>(30);
  const displayHealthRef = useRef<number>(30);

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { animalsRef.current = animals; }, [animals]);
  useEffect(() => { highlightRef.current = highlightPlayerId; }, [highlightPlayerId]);
  useEffect(() => { ecoHealthRef.current = ecosystemHealth ?? 30; }, [ecosystemHealth]);

  useEffect(() => {
    if (!hazardEvent) return;
    const cam = cameraRef.current;
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const tW = (W - PAD * 2) / COLS, tH = (H - PAD * 2) / TOTAL_ROWS;
    const c = getTileCenter(Math.max(0, Math.min(TILES - 1, hazardEvent.tileIndex)), tW, tH);
    cam.tcx = c.x; cam.tcy = c.y; cam.tz = 2.8; cam.returnTimer = 3.5;
    // Launch predator cutscene — cycle through eagle / wolf / tiger by tile
    const types: PredatorCutscene['predatorType'][] = ['eagle', 'wolf', 'tiger'];
    predatorRef.current = {
      predatorType: types[hazardEvent.tileIndex % 3],
      boardTx: c.x, boardTy: c.y,
      startT: performance.now() / 1000,
      duration: 3.2,
    };
    // Keep a shorter overlay as a subtle underlay, cutscene takes visual priority
    overlayRef.current = { tileIndex: hazardEvent.tileIndex, type: "hazard", startT: performance.now() / 1000, duration: 3.2 };
  }, [hazardEvent]);

  useEffect(() => {
    if (!bonusEvent) return;
    const cam = cameraRef.current;
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const tW = (W - PAD * 2) / COLS, tH = (H - PAD * 2) / TOTAL_ROWS;
    const c = getTileCenter(Math.max(0, Math.min(TILES - 1, bonusEvent.tileIndex)), tW, tH);
    cam.tcx = c.x; cam.tcy = c.y; cam.tz = 2.5; cam.returnTimer = 2.8;
    overlayRef.current = { tileIndex: bonusEvent.tileIndex, type: "bonus", startT: performance.now() / 1000, duration: 2.2 };
  }, [bonusEvent]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const render = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;
      const t = timestamp / 1000;

      const rect = canvas.getBoundingClientRect();
      const W = Math.floor(rect.width), H = Math.floor(rect.height);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

      const tW = (W - PAD * 2) / COLS;
      const tH = (H - PAD * 2) / TOTAL_ROWS;
      const BOARD_CX = PAD + COLS * tW / 2;
      const BOARD_CY = PAD + TOTAL_ROWS * tH / 2;

      // Compute tile centers
      const centers: { x: number; y: number }[] = [];
      for (let i = 0; i < TILES; i++) centers.push(getTileCenter(i, tW, tH));

      // ── Camera update ──────────────────────────────────────────────────────
      const cam = cameraRef.current;
      if (!cam.initialized) { cam.cx = BOARD_CX; cam.cy = BOARD_CY; cam.tcx = BOARD_CX; cam.tcy = BOARD_CY; cam.initialized = true; }

      // Handle return-to-full-board timer
      if (cam.returnTimer > 0) {
        cam.returnTimer -= dt;
        if (cam.returnTimer <= 0) { cam.returnTimer = 0; cam.tcx = BOARD_CX; cam.tcy = BOARD_CY; cam.tz = 1; }
      }

      // Smooth camera lerp
      const lf = Math.min(1, 2.8 * dt);
      cam.cx += (cam.tcx - cam.cx) * lf;
      cam.cy += (cam.tcy - cam.cy) * lf;
      cam.zoom += (cam.tz - cam.zoom) * lf;

      // Clear
      ctx.fillStyle = "#050a05"; ctx.fillRect(0, 0, W, H);

      // Apply camera transform (zoom centered on cam.cx, cam.cy)
      ctx.save();
      ctx.setTransform(cam.zoom, 0, 0, cam.zoom, W / 2 - cam.cx * cam.zoom, H / 2 - cam.cy * cam.zoom);

      // ── Zone environments (full-width bands) ──────────────────────────────
      // top to bottom: Restoration → Human Impact → Desert → Ocean → Forest
      // zone 0: displayRows 0-1 (Restoration) — canvas top
      // zone 1: displayRows 2-3 (Human Impact)
      // zone 2: displayRows 4-5 (Desert)
      // zone 3: displayRows 6-7 (Ocean)
      // zone 4: displayRows 8-9 (Forest) — canvas bottom

      // Smooth-animate ecosystem health display value
      displayHealthRef.current += (ecoHealthRef.current - displayHealthRef.current) * Math.min(1, dt * 1.8);
      const dHealth = displayHealthRef.current;

      const zH = 2 * tH; // height of each zone
      renderRestoration(ctx, 0, PAD + 0 * tH, W, zH, t);
      renderHumanImpact(ctx, 0, PAD + 2 * tH, W, zH, t);
      renderDesert(ctx, 0, PAD + 4 * tH, W, zH, t);
      renderOcean(ctx, 0, PAD + 6 * tH, W, zH, t);
      renderForest(ctx, 0, PAD + 8 * tH, W, zH, t);

      // ── Ecosystem health board overlay ─────────────────────────────────────
      if (dHealth < 40) {
        // Pollution haze — brownish smog tint across whole board
        const pollA = ((40 - dHealth) / 40) * 0.24;
        ctx.save(); ctx.globalAlpha = pollA; ctx.fillStyle = '#6b4c2a'; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      if (dHealth > 65) {
        // Vitality glow — green warmth on forest and restoration zones
        const vitalA = ((dHealth - 65) / 35) * 0.14;
        ctx.save(); ctx.globalAlpha = vitalA;
        ctx.fillStyle = '#16a34a'; ctx.fillRect(0, PAD + 8 * tH, W, zH);
        ctx.fillStyle = '#4ade80'; ctx.fillRect(0, PAD, W, zH);
        ctx.restore();
      }

      // ── Zone name labels (subtle, large) ──────────────────────────────────
      const zoneNames = ["RESTORATION", "HUMAN IMPACT", "DESERT", "OCEAN", "FOREST"];
      const zoneAccs = ["#4ade80", "#6b7280", "#f59e0b", "#60a5fa", "#22c55e"];
      zoneNames.forEach((name, zi) => {
        ctx.save();
        ctx.font = `bold ${Math.max(10, tH * 0.24)}px sans-serif`;
        ctx.fillStyle = zoneAccs[zi] + "25";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(name, W / 2, PAD + (zi * 2 + 1) * tH);
        ctx.restore();
      });

      // ── Nature trail ───────────────────────────────────────────────────────
      drawNaturePath(ctx, centers, tW, tH);

      // ── Waypoints ──────────────────────────────────────────────────────────
      drawWaypoints(ctx, centers, tW, tH, t);

      // ── Particles ──────────────────────────────────────────────────────────
      const healthSpawnMult = 0.4 + (dHealth / 100) * 1.6;
      if (Math.random() < 0.28 * healthSpawnMult && particlesRef.current.length < 90) {
        const zone = Math.floor(Math.random() * 5);
        const tileI = zone * 20 + Math.floor(Math.random() * 20);
        const c2 = centers[Math.min(tileI, TILES - 1)];
        particlesRef.current.push(spawnParticle(c2.x, c2.y, zone, tW));
      }
      for (let pi = particlesRef.current.length - 1; pi >= 0; pi--) {
        const p = particlesRef.current[pi];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.rotation += p.rotSpeed * dt;
        if (p.life <= 0) { particlesRef.current.splice(pi, 1); continue; }
        const alpha = Math.min(1, p.life / (p.maxLife * 0.25)) * 0.55;
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color;
        if (p.shape === "leaf") { ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
        else if (p.shape === "spark") { ctx.beginPath(); for (let si = 0; si < 4; si++) { const a = (si / 4) * Math.PI * 2, r = si % 2 === 0 ? p.size : p.size * 0.38; if (si === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }

      // ── Event overlay ──────────────────────────────────────────────────────
      const overlay = overlayRef.current;
      if (overlay) {
        const elapsed = t - overlay.startT;
        if (elapsed < overlay.duration) drawOverlay(ctx, overlay, elapsed, centers, tH);
        else overlayRef.current = null;
      }

      // ── Players ────────────────────────────────────────────────────────────
      const currentPlayers = playersRef.current;
      const currentAnimals = animalsRef.current;

      // Per-body-plan movement speeds (tiles/sec) and arc heights (fraction of tH)
      function getMoveProfile(animalId: string): { speed: number; arcH: number } {
        const plan = getBodyPlan(animalId);
        switch (plan) {
          case 'bird':    return { speed: 7.0, arcH: 1.2 };
          case 'rabbit':  return { speed: 5.5, arcH: 0.9 };
          case 'feline':  return { speed: 6.0, arcH: 0.7 };
          case 'canine':  return { speed: 5.5, arcH: 0.6 };
          case 'snake':   return { speed: 4.0, arcH: 0.05 };
          case 'turtle':  return { speed: 2.5, arcH: 0.25 };
          case 'aquatic': return { speed: 5.0, arcH: 0.35 };
          case 'insect':  return { speed: 6.5, arcH: 1.0 };
          default:        return { speed: 4.5, arcH: 0.55 };
        }
      }

      const renderTileOf = new Map<string, number>();
      let anyMoving = false;
      let movingCamX = 0, movingCamY = 0, movingCount = 0;

      currentPlayers.forEach(p => {
        const tile = Math.max(0, Math.min(p.position, TILES - 1));
        let st = animState.current.get(p.id);
        if (!st) {
          const c0 = centers[tile];
          st = { currentTile: tile, targetTile: tile, moveQueue: [], moveLerp: 0, bounceTimer: 0, movingForward: true, stepTimer: 0, trailX: c0.x, trailY: c0.y };
          animState.current.set(p.id, st);
        }
        if (st.moveQueue.length === 0 && st.targetTile !== tile) {
          const from = st.currentTile, mq: number[] = [];
          const forward = tile > from;
          st.movingForward = forward;
          if (forward) for (let i = from + 1; i <= tile; i++) mq.push(Math.min(i, TILES - 1));
          else for (let i = from - 1; i >= tile; i--) mq.push(Math.max(i, 0));
          st.moveQueue = mq; st.targetTile = tile; st.moveLerp = 0;
        }
        const { speed } = getMoveProfile(p.animalId);
        if (st.moveQueue.length > 0) {
          st.moveLerp += dt * speed;
          st.stepTimer -= dt;
          while (st.moveLerp >= 1 && st.moveQueue.length > 0) {
            st.moveLerp -= 1;
            st.currentTile = st.moveQueue.shift()!;
            st.stepTimer = 0.08; // spawn trail burst on each step
          }
          if (st.moveQueue.length === 0) { st.bounceTimer = 0.45; st.moveLerp = 0; }
          anyMoving = true;
          // Accumulate camera target toward the moving player's interpolated pos
          const fc = centers[Math.max(0, Math.min(TILES - 1, st.currentTile))];
          movingCamX += fc.x; movingCamY += fc.y; movingCount++;
        }
        renderTileOf.set(p.id, st.currentTile);
      });

      // Camera: follow moving players at moderate zoom; return to full board when idle
      if (!overlayRef.current) {
        if (anyMoving && movingCount > 0) {
          cam.tcx = movingCamX / movingCount;
          cam.tcy = movingCamY / movingCount;
          cam.tz = movingCount === 1 ? 2.0 : 1.5;
          cam.followingPlayer = true;
          cam.returnTimer = 0;
        } else if (cam.followingPlayer) {
          cam.followingPlayer = false;
          cam.tcx = BOARD_CX; cam.tcy = BOARD_CY; cam.tz = 1;
          cam.returnTimer = 0;
        }
      }

      const byTile = new Map<number, string[]>();
      currentPlayers.forEach(p => { const rt = renderTileOf.get(p.id) ?? 0; if (!byTile.has(rt)) byTile.set(rt, []); byTile.get(rt)!.push(p.id); });

      currentPlayers.forEach((p, pIdx) => {
        const st = animState.current.get(p.id); if (!st) return;
        const group = byTile.get(st.currentTile) ?? [];
        const myIdx = group.indexOf(p.id);
        let ox = 0, oy = 0;
        if (group.length > 1) { const a = (myIdx / group.length) * Math.PI * 2 - Math.PI / 2; const rad = tW * 0.22; ox = Math.cos(a) * rad; oy = Math.sin(a) * rad; }

        const animal = currentAnimals.find(a => a.id === p.animalId);
        const primaryColor = animal?.colorPrimary || "#16a34a";
        const { arcH } = getMoveProfile(p.animalId);
        const isMoving = st.moveQueue.length > 0;

        let px: number, py: number;
        let arcOffset = 0;
        let scaleX = 1, scaleY = 1;
        let tiltAngle = 0;

        if (isMoving) {
          const fc2 = centers[Math.max(0, Math.min(TILES - 1, st.currentTile))];
          const tc = centers[Math.max(0, Math.min(TILES - 1, st.moveQueue[0]))];
          const prog = eio(Math.min(1, st.moveLerp));
          const rawProg = Math.min(1, st.moveLerp);
          px = fc2.x + (tc.x - fc2.x) * prog + ox;
          py = fc2.y + (tc.y - fc2.y) * prog + oy;

          // Parabolic hop arc — peak at midpoint
          arcOffset = -Math.sin(rawProg * Math.PI) * tH * arcH;

          // Squash & stretch: stretch vertically at peak (rawProg≈0.5), squash on takeoff/land
          const stretchPhase = Math.sin(rawProg * Math.PI);
          scaleY = 1 + stretchPhase * 0.28;
          scaleX = 1 - stretchPhase * 0.12;

          // Tilt in direction of movement
          const dx = tc.x - fc2.x, dy = (tc.y - fc2.y);
          tiltAngle = Math.atan2(dy, dx) * 0.22;

          // Trail: spawn dust particle at previous position periodically
          if (st.stepTimer <= 0 && particlesRef.current.length < 120) {
            const trailColors = ["rgba(255,255,255,0.6)", primaryColor + "99", "#fde68a88"];
            for (let ti = 0; ti < 3; ti++) {
              particlesRef.current.push({
                x: st.trailX + (Math.random() - 0.5) * tW * 0.3,
                y: st.trailY + (Math.random() - 0.5) * tH * 0.3,
                vx: (Math.random() - 0.5) * tW * 0.6,
                vy: -(Math.random() * tH * 0.8 + tH * 0.2),
                life: 0.35 + Math.random() * 0.2,
                maxLife: 0.55,
                color: trailColors[ti % 3],
                size: Math.max(2, tW * 0.04) * (0.5 + Math.random() * 0.5),
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 8,
                shape: "circle",
              });
            }
          }
          st.trailX = px; st.trailY = py;
        } else {
          const c2 = centers[Math.max(0, Math.min(TILES - 1, st.currentTile))];
          px = c2.x + ox; py = c2.y + oy;
          st.trailX = px; st.trailY = py;
        }

        // Idle animations (suppressed while moving fast)
        const idleFactor = isMoving ? 0 : 1;
        const floatY = Math.sin(t * 1.4 + pIdx * 1.1) * tH * 0.03 * idleFactor;
        const breathScale = 1 + 0.018 * Math.sin(t * 1.4 + pIdx * 2.1) * idleFactor;

        // Landing bounce
        let bounceScale = 1;
        if (st.bounceTimer > 0) {
          st.bounceTimer = Math.max(0, st.bounceTimer - dt);
          const bProg = 1 - st.bounceTimer / 0.45;
          // squash on land, then spring back
          bounceScale = bProg < 0.3
            ? 1 - 0.3 * (bProg / 0.3)               // squash
            : 1 + 0.2 * Math.sin((bProg - 0.3) / 0.7 * Math.PI); // spring
          scaleX = 1 + (1 / bounceScale - 1) * 0.6; // counter-squash horizontally
        }

        const finalScaleX = scaleX * breathScale * (isMoving ? 1 : bounceScale);
        const finalScaleY = scaleY * breathScale * bounceScale;
        const tokenR = tH * 0.65;
        const finalPy = py + floatY + arcOffset;
        const isHL = highlightRef.current === p.id;

        // Ground shadow (grows/shrinks with arc height)
        const shadowAlpha = isMoving ? 0.15 + 0.25 * (1 - Math.abs(arcOffset) / (tH * arcH + 0.001)) : 0.35;
        ctx.save();
        ctx.globalAlpha = shadowAlpha;
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.beginPath();
        ctx.ellipse(px, py + tokenR * 0.3, tokenR * finalScaleX * 0.8, tokenR * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw token with squash/stretch transform
        ctx.save();
        ctx.translate(px, finalPy);
        if (tiltAngle !== 0) ctx.rotate(tiltAngle);
        ctx.scale(finalScaleX, finalScaleY);
        ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 14;

        ctx.beginPath(); ctx.arc(0, 0, tokenR, 0, Math.PI * 2);
        const tg = ctx.createRadialGradient(-tokenR * 0.3, -tokenR * 0.3, 0, 0, 0, tokenR);
        tg.addColorStop(0, primaryColor + "ff"); tg.addColorStop(1, primaryColor + "aa");
        ctx.fillStyle = tg; ctx.fill();
        ctx.strokeStyle = isHL ? "#fbbf24" : "rgba(255,255,255,0.8)";
        ctx.lineWidth = isHL ? Math.max(3, tH * 0.04) : Math.max(2, tH * 0.02);
        ctx.stroke();

        if (isHL) {
          ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 24;
          ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = Math.max(2, tH * 0.025);
          ctx.beginPath(); ctx.arc(0, 0, tokenR * 1.12, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.restore();

        // Draw portrait (no squash/stretch on the face — just position/arc)
        drawAnimalPortrait(ctx, p.animalId, animal?.colorPrimary, animal?.colorSecondary, px, finalPy, tokenR * 0.95);

        // Speed lines during fast movement (birds / felines)
        if (isMoving && arcH > 0.6) {
          const plan = getBodyPlan(p.animalId);
          if (plan === 'bird' || plan === 'feline' || plan === 'insect') {
            ctx.save(); ctx.globalAlpha = 0.25;
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = Math.max(1, tH * 0.015);
            for (let li = 0; li < 4; li++) {
              const lox = (Math.random() - 0.5) * tokenR * 1.8;
              const loy = (Math.random() - 0.5) * tokenR * 1.2;
              const len = tokenR * (0.4 + Math.random() * 0.6);
              const dirX = st.movingForward ? -1 : 1;
              ctx.beginPath();
              ctx.moveTo(px + lox, finalPy + loy);
              ctx.lineTo(px + lox + dirX * len, finalPy + loy);
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // Name label — large and readable for projector
        const nameFontSize = Math.max(10, tH * 0.22);
        const namePy = py + tokenR * finalScaleY + floatY + arcOffset + tH * 0.03;
        ctx.save(); ctx.font = `bold ${nameFontSize}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "top";
        const nw = ctx.measureText(p.name).width;
        const nPad = nameFontSize * 0.35;
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.beginPath(); ctx.roundRect(px - nw / 2 - nPad, namePy - nPad * 0.5, nw + nPad * 2, nameFontSize + nPad, nameFontSize * 0.4); ctx.fill();
        ctx.fillStyle = isHL ? "#fde68a" : primaryColor;
        ctx.fillText(p.name, px, namePy);
        ctx.restore();
      });

      animState.current.forEach((_, id) => { if (!currentPlayers.find(p => p.id === id)) animState.current.delete(id); });

      ctx.restore(); // restore camera transform

      // ── Ecosystem health meter (screen-space, always visible) ────────────────
      drawEcosystemMeter(ctx, dHealth, W, H, t);

      // ── Predator cutscene (screen-space, drawn over everything) ──────────────
      const predScene = predatorRef.current;
      if (predScene) {
        const predElapsed = t - predScene.startT;
        if (predElapsed < predScene.duration) {
          drawPredatorCutscene(ctx, predScene, predElapsed, W, H, tH, cam.zoom, cam.cx, cam.cy);
        } else {
          predatorRef.current = null;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: "none" }} />;
}
