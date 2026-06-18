// env-objects.ts
// Large animated environmental sprites for EcoQuest game board.
// All functions: drawXxx(ctx, cx, cy, r, t)
//   cx,cy = tile center   r = sprite radius   t = time in seconds

type C = CanvasRenderingContext2D;

// ── Shared helpers ─────────────────────────────────────────────────────────────
function lw(r: number) { return Math.max(2, r * 0.09); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function flame(ctx: C, x: number, y: number, w: number, h: number, col: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - w * 0.6, y - h * 0.4, x - w * 0.3, y - h * 0.8, x, y - h);
  ctx.bezierCurveTo(x + w * 0.3, y - h * 0.8, x + w * 0.6, y - h * 0.4, x, y);
  ctx.fill(); ctx.restore();
}
function wavyLine(ctx: C, x1: number, y: number, x2: number, amp: number, freq: number, t: number) {
  ctx.beginPath();
  const steps = 20;
  for (let s = 0; s <= steps; s++) {
    const x = x1 + (x2 - x1) * (s / steps);
    const wy = y + Math.sin((s / steps) * Math.PI * freq + t * 3) * amp;
    if (s === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
  }
  ctx.stroke();
}
function sparks(ctx: C, cx: number, baseY: number, r: number, count: number, t: number, col1: string, col2: string) {
  for (let s = 0; s < count; s++) {
    const p = (t * 1.6 + s / count) % 1;
    const sx = cx + (((s * 7 + 3) % 9) - 4) * r * 0.12 + Math.sin(p * Math.PI * 2 + s) * r * 0.09;
    const sy = baseY - p * r * 1.1;
    ctx.save(); ctx.globalAlpha = (1 - p) * 0.9;
    ctx.fillStyle = p < 0.35 ? col1 : col2;
    ctx.beginPath(); ctx.arc(sx, sy, r * 0.055 * (1 - p * 0.6), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
function smokeCloud(ctx: C, cx: number, cy: number, r: number, t: number, col: string) {
  for (let s = 0; s < 5; s++) {
    const p = (t * 0.55 + s * 0.2) % 1;
    const sx = cx + (s - 2) * r * 0.18 + Math.sin(p * Math.PI * 2 + s) * r * 0.12;
    const sy = cy - p * r * 1.2;
    ctx.save(); ctx.globalAlpha = (1 - p) * 0.6;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(sx, sy, r * (0.18 + p * 0.22), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ── FOREST HAZARDS ─────────────────────────────────────────────────────────────
function drawWolf(ctx: C, cx: number, cy: number, r: number, t: number) {
  const sway = Math.sin(t * 1.6) * r * 0.025;
  const L = lw(r);
  ctx.strokeStyle = "#374151"; ctx.lineWidth = L; ctx.lineCap = "round";

  // body
  ctx.fillStyle = "#6b7280";
  ctx.beginPath(); ctx.ellipse(cx - r * 0.05, cy + r * 0.18 + sway, r * 0.52, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // head
  ctx.beginPath(); ctx.ellipse(cx + r * 0.44, cy - r * 0.05 + sway, r * 0.29, r * 0.26, 0.25, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // ears
  ctx.fillStyle = "#6b7280";
  [[cx + r * 0.26, cy - r * 0.22], [cx + r * 0.52, cy - r * 0.22]].forEach(([ex, ey], i) => {
    ctx.beginPath();
    ctx.moveTo(ex + sway * 0.5, (ey as number) + sway);
    ctx.lineTo(ex + (i === 0 ? -r * 0.1 : r * 0.1) + sway * 0.5, (ey as number) - r * 0.28 + sway);
    ctx.lineTo(ex + (i === 0 ? r * 0.1 : -r * 0.1) + sway * 0.5, (ey as number) + sway);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  // inner ears
  ctx.fillStyle = "#f9a8d4"; ctx.strokeStyle = "transparent";
  [[cx + r * 0.26, cy - r * 0.22], [cx + r * 0.52, cy - r * 0.22]].forEach(([ex, ey], i) => {
    ctx.beginPath();
    ctx.moveTo(ex + sway * 0.5, (ey as number) + sway);
    ctx.lineTo(ex + (i === 0 ? -r * 0.05 : r * 0.05) + sway * 0.5, (ey as number) - r * 0.16 + sway);
    ctx.lineTo(ex + (i === 0 ? r * 0.05 : -r * 0.05) + sway * 0.5, (ey as number) + sway);
    ctx.closePath(); ctx.fill();
  });
  ctx.strokeStyle = "#374151";
  // snout
  ctx.fillStyle = "#9ca3af";
  ctx.beginPath(); ctx.ellipse(cx + r * 0.67, cy - r * 0.03 + sway, r * 0.13, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // eyes
  ctx.fillStyle = "#fde047"; ctx.shadowColor = "#fde047"; ctx.shadowBlur = 7;
  [cx + r * 0.3, cx + r * 0.48].forEach(ex => {
    ctx.beginPath(); ctx.arc(ex, cy - r * 0.1 + sway, r * 0.075, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "#111"; ctx.shadowBlur = 0;
  [cx + r * 0.32, cx + r * 0.5].forEach(ex => {
    ctx.beginPath(); ctx.arc(ex, cy - r * 0.1 + sway, r * 0.042, 0, Math.PI * 2); ctx.fill();
  });
  // nose
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.ellipse(cx + r * 0.73, cy - r * 0.065 + sway, r * 0.048, r * 0.034, 0, 0, Math.PI * 2); ctx.fill();
  // tail (wag)
  const wag = Math.sin(t * 3.8) * r * 0.28;
  ctx.strokeStyle = "#6b7280"; ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.56, cy + r * 0.1 + sway);
  ctx.quadraticCurveTo(cx - r * 0.75, cy - r * 0.25 + wag, cx - r * 0.62, cy - r * 0.54 + wag);
  ctx.stroke();
  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.63, cy - r * 0.42 + wag); ctx.lineTo(cx - r * 0.6, cy - r * 0.58 + wag); ctx.stroke();
  // legs
  ctx.strokeStyle = "#6b7280"; ctx.lineWidth = r * 0.1;
  const ls = Math.sin(t * 3.2) * r * 0.07;
  [[-0.28, 0.41], [-0.08, 0.42], [0.14, 0.41], [0.34, 0.42]].forEach(([lx, ly], i) => {
    ctx.beginPath();
    ctx.moveTo(cx + lx * r, cy + ly * r);
    ctx.lineTo(cx + lx * r + (i % 2 === 0 ? -ls : ls), cy + ly * r + r * 0.27);
    ctx.stroke();
  });
}

function drawTiger(ctx: C, cx: number, cy: number, r: number, t: number) {
  const sway = Math.sin(t * 1.4) * r * 0.022;
  const L = lw(r);
  ctx.strokeStyle = "#1c1917"; ctx.lineWidth = L;

  // body
  ctx.fillStyle = "#f97316";
  ctx.beginPath(); ctx.ellipse(cx - r * 0.05, cy + r * 0.16 + sway, r * 0.55, r * 0.33, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // stripes on body
  ctx.strokeStyle = "#1c1917"; ctx.lineWidth = Math.max(1.5, r * 0.055);
  [[-0.15, -0.28], [0.05, -0.2], [0.25, -0.24]].forEach(([ox, oy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + ox * r, cy + (oy - 0.1) * r + sway);
    ctx.lineTo(cx + (ox + 0.04) * r, cy + (oy + 0.22) * r + sway);
    ctx.stroke();
  });
  // head (rounder, crouching)
  ctx.fillStyle = "#f97316"; ctx.strokeStyle = "#1c1917"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.ellipse(cx + r * 0.42, cy - r * 0.08 + sway, r * 0.3, r * 0.28, 0.1, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // ears
  ctx.fillStyle = "#f97316";
  [[cx + r * 0.24, cy - r * 0.25], [cx + r * 0.54, cy - r * 0.24]].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.moveTo(ex as number, (ey as number) + sway);
    ctx.lineTo((ex as number) - r * 0.06, (ey as number) - r * 0.18 + sway);
    ctx.lineTo((ex as number) + r * 0.1, (ey as number) + sway);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = "#fda4af";
  [[cx + r * 0.24, cy - r * 0.25], [cx + r * 0.54, cy - r * 0.24]].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.moveTo(ex as number, (ey as number) + sway);
    ctx.lineTo((ex as number) - r * 0.03, (ey as number) - r * 0.1 + sway);
    ctx.lineTo((ex as number) + r * 0.06, (ey as number) + sway);
    ctx.closePath(); ctx.fill();
  });
  // eyes
  ctx.fillStyle = "#fbbf24"; ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.ellipse(cx + r * 0.31, cy - r * 0.11 + sway, r * 0.075, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + r * 0.51, cy - r * 0.11 + sway, r * 0.075, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111"; ctx.shadowBlur = 0;
  [cx + r * 0.32, cx + r * 0.52].forEach(ex => {
    ctx.beginPath(); ctx.arc(ex, cy - r * 0.11 + sway, r * 0.04, 0, Math.PI * 2); ctx.fill();
  });
  // striped tail
  const tailSway = Math.sin(t * 2.2) * r * 0.2;
  ctx.strokeStyle = "#f97316"; ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.57, cy + r * 0.12 + sway);
  ctx.quadraticCurveTo(cx - r * 0.78, cy - r * 0.28 + tailSway, cx - r * 0.65, cy - r * 0.56 + tailSway);
  ctx.stroke();
  ctx.strokeStyle = "#1c1917"; ctx.lineWidth = r * 0.065;
  for (let s = 0; s < 3; s++) {
    const p = s / 3;
    const qx = cx - r * 0.57 + (cx - r * 0.65 - cx + r * 0.57) * p;
    const qy = cy + r * 0.12 + (cy - r * 0.56 + tailSway - cy - r * 0.12) * p;
    ctx.beginPath(); ctx.arc(qx, qy, r * 0.02, 0, Math.PI * 2);
  }
}

function drawForestFire(ctx: C, cx: number, cy: number, r: number, t: number) {
  // Ground
  ctx.fillStyle = "#7c2d12";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.55, r * 0.8, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();

  // Log
  ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = lw(r);
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.6, cy + r * 0.52); ctx.lineTo(cx + r * 0.6, cy + r * 0.52);
  ctx.arcTo(cx + r * 0.68, cy + r * 0.52, cx + r * 0.6, cy + r * 0.65, r * 0.12);
  ctx.lineTo(cx - r * 0.6, cy + r * 0.65);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Flame cores (bottom to top: red → orange → yellow)
  const flk = [
    [0, r * 0.48, r * 0.24, r * 0.78, "#ef4444"],
    [-r * 0.22, r * 0.48, r * 0.18, r * 0.6, "#f97316"],
    [r * 0.2, r * 0.48, r * 0.2, r * 0.65, "#f97316"],
    [0, r * 0.35, r * 0.16, r * 0.5, "#fbbf24"],
  ];
  flk.forEach(([ox, baseY, fw, fh, col]) => {
    const flicker = Math.sin(t * 8.5 + (ox as number) * 10) * r * 0.06;
    flame(ctx, cx + (ox as number), cy + (baseY as number), fw as number, (fh as number) + flicker, col as string, 0.92);
  });
  // White-hot center
  flame(ctx, cx, cy + r * 0.38, r * 0.09, r * 0.28, "#fef9c3", 0.7);

  // Rising sparks
  sparks(ctx, cx, cy + r * 0.38, r, 7, t, "#fbbf24", "#ef4444");

  // Smoke
  smokeCloud(ctx, cx, cy - r * 0.55, r, t, "#374151");
}

function drawFallenTree(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.35);

  // Root ball
  ctx.fillStyle = "#78350f"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.arc(-r * 0.72, 0, r * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // roots
  ctx.strokeStyle = "#78350f"; ctx.lineWidth = Math.max(1.5, r * 0.05);
  [[-r * 0.88, -r * 0.3], [-r * 0.96, r * 0.0], [-r * 0.88, r * 0.32]].forEach(([rx, ry]) => {
    ctx.beginPath(); ctx.moveTo(-r * 0.72, 0); ctx.lineTo(rx as number, ry as number); ctx.stroke();
  });

  // Log body
  ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.roundRect(-r * 0.7, -r * 0.12, r * 1.4, r * 0.24, r * 0.12); ctx.fill(); ctx.stroke();

  // Bark lines
  ctx.strokeStyle = "#78350f"; ctx.lineWidth = Math.max(1, r * 0.03);
  for (let b = 0; b < 5; b++) {
    const bx = -r * 0.5 + b * r * 0.24;
    ctx.beginPath(); ctx.moveTo(bx, -r * 0.09); ctx.lineTo(bx + r * 0.04, r * 0.09); ctx.stroke();
  }

  // Cut face
  ctx.fillStyle = "#d97706";
  ctx.beginPath(); ctx.ellipse(r * 0.7, 0, r * 0.14, r * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#92400e"; ctx.lineWidth = Math.max(1, r * 0.025);
  for (let rg = 1; rg <= 3; rg++) {
    ctx.beginPath(); ctx.arc(r * 0.7, 0, r * 0.04 * rg, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.restore();

  // Scattered leaves
  const leafColors = ["#15803d", "#16a34a", "#86efac"];
  for (let li = 0; li < 5; li++) {
    const la = (li * 1.3 + t * 0.4) % (Math.PI * 2);
    const ld = r * (0.55 + li * 0.1);
    const lx = cx + Math.cos(la + li * 0.8) * ld;
    const ly = cy + r * 0.3 + Math.sin(la * 2) * r * 0.15;
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(la + t * 0.3);
    ctx.fillStyle = leafColors[li % 3];
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.1, r * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawLoggingCamp(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);

  // Stump
  ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.42, r * 0.38, r * 0.11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#d97706";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.22, r * 0.38, r * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Growth rings
  ctx.strokeStyle = "#92400e"; ctx.lineWidth = Math.max(1, r * 0.025);
  for (let rg = 1; rg <= 3; rg++) ctx.beginPath(), ctx.arc(cx, cy + r * 0.22, r * 0.08 * rg, 0, Math.PI * 2), ctx.stroke();

  // Log pile (to side)
  [[-r * 0.66, r * 0.35], [-r * 0.66, r * 0.22]].forEach(([lx, ly]) => {
    ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
    ctx.beginPath(); ctx.roundRect((lx as number) - r * 0.2, (ly as number) - r * 0.08, r * 0.4, r * 0.14, r * 0.07); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#d97706"; ctx.strokeStyle = "none";
    ctx.beginPath(); ctx.ellipse((lx as number) + r * 0.2, (ly as number), r * 0.08, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  });

  // Axe (embedded in stump)
  const glint = 0.5 + 0.5 * Math.sin(t * 2.5);
  ctx.save();
  ctx.translate(cx + r * 0.12, cy + r * 0.05);
  ctx.rotate(Math.PI * 0.12);
  // Handle
  ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.beginPath(); ctx.roundRect(-r * 0.04, -r * 0.65, r * 0.08, r * 0.68, r * 0.04); ctx.fill(); ctx.stroke();
  // Axe head
  ctx.fillStyle = lerpColorStr("#6b7280", "#d1d5db", glint);
  ctx.beginPath();
  ctx.moveTo(-r * 0.04, -r * 0.64); ctx.lineTo(-r * 0.28, -r * 0.82);
  ctx.lineTo(-r * 0.2, -r * 0.46); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();

  // Sawdust particles
  sparks(ctx, cx, cy + r * 0.2, r * 0.5, 4, t * 0.7, "#fde68a", "#d97706");
}

// ── OCEAN HAZARDS ──────────────────────────────────────────────────────────────
function drawShark(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);
  const finX = cx + Math.sin(t * 1.5) * r * 0.28;
  const waterY = cy + r * 0.05;

  // Water
  ctx.fillStyle = "#0369a1";
  ctx.beginPath(); ctx.ellipse(cx, waterY + r * 0.28, r * 0.88, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  // Wave line
  ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = Math.max(1.5, r * 0.045);
  wavyLine(ctx, cx - r * 0.88, waterY, cx + r * 0.88, r * 0.055, 2.5, t);

  // Body (below water)
  ctx.fillStyle = "#64748b"; ctx.strokeStyle = "#1e293b"; ctx.lineWidth = L;
  ctx.beginPath();
  ctx.ellipse(finX, waterY + r * 0.22, r * 0.7, r * 0.19, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Tail fin
  ctx.fillStyle = "#64748b";
  ctx.beginPath();
  ctx.moveTo(finX - r * 0.65, waterY + r * 0.22);
  ctx.lineTo(finX - r * 0.88, waterY + r * 0.06);
  ctx.lineTo(finX - r * 0.88, waterY + r * 0.38);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Pectoral fins
  ctx.beginPath();
  ctx.moveTo(finX, waterY + r * 0.25);
  ctx.lineTo(finX - r * 0.2, waterY + r * 0.46);
  ctx.lineTo(finX + r * 0.2, waterY + r * 0.3);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Head + Teeth
  ctx.fillStyle = "#64748b";
  ctx.beginPath(); ctx.ellipse(finX + r * 0.7, waterY + r * 0.22, r * 0.22, r * 0.16, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  for (let tooth = 0; tooth < 4; tooth++) {
    const tx = finX + r * 0.58 + tooth * r * 0.08;
    ctx.beginPath(); ctx.moveTo(tx, waterY + r * 0.3); ctx.lineTo(tx + r * 0.035, waterY + r * 0.4); ctx.lineTo(tx + r * 0.07, waterY + r * 0.3); ctx.fill();
  }

  // Dorsal fin (above water, prominent)
  ctx.fillStyle = "#475569"; ctx.strokeStyle = "#1e293b"; ctx.lineWidth = L;
  ctx.beginPath();
  ctx.moveTo(finX - r * 0.08, waterY + r * 0.01);
  ctx.lineTo(finX - r * 0.28, waterY - r * 0.5);
  ctx.lineTo(finX + r * 0.24, waterY);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Eye
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(finX + r * 0.58, waterY + r * 0.18, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(finX + r * 0.61, waterY + r * 0.16, r * 0.02, 0, Math.PI * 2); ctx.fill();

  // Ripples from fin
  ctx.save(); ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "#7dd3fc"; ctx.lineWidth = Math.max(1, r * 0.03);
  for (let rp = 0; rp < 2; rp++) {
    const rpa = (t * 1.8 + rp * 0.5) % 1;
    ctx.globalAlpha = (1 - rpa) * 0.45;
    ctx.beginPath(); ctx.ellipse(finX, waterY + r * 0.02, r * 0.18 + rpa * r * 0.4, r * 0.05, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawJellyfish(ctx: C, cx: number, cy: number, r: number, t: number) {
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.2); // bell pulsing
  const bw = r * 0.72 * pulse;
  const bh = r * 0.44;

  // Bell
  const bellG = ctx.createRadialGradient(cx, cy - bh * 0.2, 0, cx, cy, bw);
  bellG.addColorStop(0, "rgba(232,121,249,0.9)");
  bellG.addColorStop(0.6, "rgba(168,85,247,0.7)");
  bellG.addColorStop(1, "rgba(109,40,217,0.3)");
  ctx.fillStyle = bellG;
  ctx.beginPath();
  ctx.arc(cx, cy - bh * 0.12, bw, Math.PI, 0);
  ctx.bezierCurveTo(cx + bw, cy - bh * 0.12 + bh * 0.6, cx - bw, cy - bh * 0.12 + bh * 0.6, cx - bw, cy - bh * 0.12);
  ctx.fill();

  // Inner dome highlight
  ctx.fillStyle = "rgba(249,168,212,0.4)";
  ctx.beginPath(); ctx.ellipse(cx, cy - bh * 0.28, bw * 0.55, bh * 0.26, 0, 0, Math.PI * 2); ctx.fill();

  // Oral arms (inner)
  ctx.strokeStyle = "rgba(216,180,254,0.8)"; ctx.lineWidth = Math.max(2, r * 0.06);
  for (let a = 0; a < 4; a++) {
    const waveOff = Math.sin(t * 1.8 + a * 0.9) * r * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx + (a - 1.5) * bw * 0.3, cy + bh * 0.42);
    ctx.quadraticCurveTo(cx + (a - 1.5) * bw * 0.3 + waveOff, cy + r * 0.55, cx + (a - 1.5) * bw * 0.2 + waveOff * 0.5, cy + r * 0.82);
    ctx.stroke();
  }
  // Long tentacles
  ctx.strokeStyle = "rgba(196,181,253,0.6)"; ctx.lineWidth = Math.max(1, r * 0.03);
  for (let tn = 0; tn < 6; tn++) {
    const txoff = (tn - 2.5) * bw * 0.3;
    const wave = Math.sin(t * 2.5 + tn * 0.7) * r * 0.18;
    ctx.beginPath();
    ctx.moveTo(cx + txoff, cy + bh * 0.44);
    ctx.bezierCurveTo(cx + txoff + wave * 0.5, cy + r * 0.65, cx + txoff + wave, cy + r * 0.9, cx + txoff + wave * 0.5, cy + r * 1.1);
    ctx.stroke();
  }

  // Glow
  ctx.save(); ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t * 2.2);
  ctx.shadowColor = "#e879f9"; ctx.shadowBlur = 22;
  ctx.strokeStyle = "#e879f9"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy - bh * 0.12, bw + 4, Math.PI, 0); ctx.stroke();
  ctx.restore();
}

function drawOilSpill(ctx: C, cx: number, cy: number, r: number, t: number) {
  // Dark spreading blob
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.18, r * 0.88, r * 0.42, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#111827";
  ctx.fillRect(cx - r, cy, r * 2, r);

  // Iridescent rainbow sheen
  const shimColors: [string, number][] = [
    ["rgba(239,68,68,0.5)", -r * 0.5],
    ["rgba(251,191,36,0.45)", -r * 0.2],
    ["rgba(74,222,128,0.4)", r * 0.05],
    ["rgba(96,165,250,0.45)", r * 0.3],
    ["rgba(168,85,247,0.4)", r * 0.55],
  ];
  shimColors.forEach(([col, ox]) => {
    const shift = Math.sin(t * 0.8 + (ox as number)) * r * 0.15;
    const g = ctx.createLinearGradient(cx + (ox as number) - r * 0.12 + shift, cy, cx + (ox as number) + r * 0.12 + shift, cy);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, col as string);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy + r * 0.02, r * 2, r * 0.35);
  });
  ctx.restore();

  // Blob edge
  ctx.strokeStyle = "#1e293b"; ctx.lineWidth = lw(r);
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.18, r * 0.88, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();

  // Spreading edge (animated)
  ctx.save(); ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#374151"; ctx.lineWidth = Math.max(1, r * 0.04);
  for (let sp = 0; sp < 3; sp++) {
    const spp = (t * 0.4 + sp * 0.33) % 1;
    ctx.globalAlpha = (1 - spp) * 0.35;
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.18, r * 0.88 + spp * r * 0.25, r * 0.42 + spp * r * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  // Dead fish silhouette
  ctx.fillStyle = "#1f2937"; ctx.strokeStyle = "#111827"; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.save(); ctx.translate(cx - r * 0.28, cy + r * 0.16); ctx.rotate(0.2);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.22, r * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r * 0.22, 0); ctx.lineTo(-r * 0.34, -r * 0.1); ctx.lineTo(-r * 0.34, r * 0.1); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Bubbles rising
  for (let b = 0; b < 4; b++) {
    const bp = (t * 0.9 + b * 0.25) % 1;
    const bx = cx + ((b % 3) - 1) * r * 0.3;
    const by = cy + r * 0.38 - bp * r * 0.35;
    ctx.save(); ctx.globalAlpha = (1 - bp) * 0.7;
    ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bx, by, r * 0.04, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawPlasticIsland(ctx: C, cx: number, cy: number, r: number, t: number) {
  const bob = Math.sin(t * 1.2) * r * 0.04;

  // Water
  ctx.fillStyle = "#0369a1";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.55, r * 0.88, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = Math.max(1.5, r * 0.04);
  wavyLine(ctx, cx - r * 0.88, cy + r * 0.5, cx + r * 0.88, r * 0.04, 3, t);

  ctx.save(); ctx.translate(0, bob);

  // Pile base
  const trashItems: [number, number, number, number, string][] = [
    [cx - r * 0.48, cy + r * 0.42, r * 0.22, r * 0.3, "#ef4444"],
    [cx - r * 0.12, cy + r * 0.38, r * 0.2, r * 0.32, "#3b82f6"],
    [cx + r * 0.28, cy + r * 0.42, r * 0.18, r * 0.28, "#f59e0b"],
    [cx - r * 0.3, cy + r * 0.22, r * 0.18, r * 0.28, "#22c55e"],
    [cx + r * 0.1, cy + r * 0.18, r * 0.16, r * 0.26, "#e879f9"],
    [cx - r * 0.05, cy + r * 0.06, r * 0.14, r * 0.2, "#f97316"],
    [cx + r * 0.35, cy + r * 0.24, r * 0.15, r * 0.24, "#06b6d4"],
  ];
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = Math.max(1, r * 0.035);
  trashItems.forEach(([bx, by, bw, bh, col]) => {
    ctx.fillStyle = col as string;
    ctx.beginPath(); ctx.roundRect((bx as number) - (bw as number) / 2, (by as number) - (bh as number) / 2, bw as number, bh as number, r * 0.04); ctx.fill(); ctx.stroke();
  });

  // Seagull
  const sgx = cx + r * 0.55, sgy = cy - r * 0.55;
  const wingFlap = Math.sin(t * 4) * 0.3;
  ctx.strokeStyle = "#475569"; ctx.lineWidth = Math.max(1.5, r * 0.04); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(sgx - r * 0.14, sgy + wingFlap * r * 0.1); ctx.quadraticCurveTo(sgx, sgy - r * 0.02, sgx + r * 0.14, sgy + wingFlap * r * 0.1); ctx.stroke();

  ctx.restore();
}

function drawStormWaves(ctx: C, cx: number, cy: number, r: number, t: number) {
  const phase = (t * 0.7) % 1;

  // Background dark water
  ctx.fillStyle = "#0c4a6e";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.35, r * 0.9, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();

  // Main wave
  const waveX = cx - r * 0.9 + phase * r * 2.0;
  ctx.save(); ctx.beginPath(); ctx.rect(cx - r, cy - r * 0.5, r * 2, r * 2); ctx.clip();

  ctx.fillStyle = "#0369a1";
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + r * 0.5);
  ctx.bezierCurveTo(waveX - r * 0.3, cy - r * 0.35, waveX, cy - r * 0.55, waveX + r * 0.35, cy - r * 0.1);
  ctx.bezierCurveTo(waveX + r * 0.5, cy + r * 0.05, waveX + r * 0.75, cy + r * 0.2, cx + r, cy + r * 0.1);
  ctx.lineTo(cx + r, cy + r * 0.5);
  ctx.closePath(); ctx.fill();

  // Wave crest foam
  ctx.strokeStyle = "#f0f9ff"; ctx.lineWidth = Math.max(2.5, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(waveX - r * 0.35, cy - r * 0.28);
  ctx.bezierCurveTo(waveX - r * 0.1, cy - r * 0.58, waveX + r * 0.1, cy - r * 0.56, waveX + r * 0.35, cy - r * 0.08);
  ctx.stroke();
  ctx.restore();

  // Rain drops
  ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = Math.max(1, r * 0.025);
  for (let d = 0; d < 8; d++) {
    const dp = (t * 2.2 + d * 0.125) % 1;
    const dx = cx - r * 0.8 + d * r * 0.23 + dp * r * 0.1;
    const dy = cy - r * 0.7 + dp * r * 1.2;
    ctx.save(); ctx.globalAlpha = (1 - dp * 0.6) * 0.8;
    ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + r * 0.03, dy + r * 0.1); ctx.stroke();
    ctx.restore();
  }

  // Lightning flash
  if (Math.sin(t * 3.2) > 0.85) {
    ctx.save(); ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "#fde047"; ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.45, cy - r * 0.72); ctx.lineTo(cx + r * 0.3, cy - r * 0.38);
    ctx.lineTo(cx + r * 0.5, cy - r * 0.38); ctx.lineTo(cx + r * 0.22, cy);
    ctx.stroke(); ctx.restore();
  }
}

// ── DESERT HAZARDS ─────────────────────────────────────────────────────────────
function drawSandstorm(ctx: C, cx: number, cy: number, r: number, t: number) {
  // Sand wall
  const sandG = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  sandG.addColorStop(0, "rgba(217,119,6,0.15)");
  sandG.addColorStop(0.5, "rgba(245,158,11,0.75)");
  sandG.addColorStop(1, "rgba(217,119,6,0.15)");
  ctx.fillStyle = sandG;
  ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.88, r * 0.82, 0, 0, Math.PI * 2); ctx.fill();

  // Swirling sand streams
  ctx.strokeStyle = "#d97706"; ctx.lineWidth = Math.max(1.5, r * 0.055);
  for (let s = 0; s < 6; s++) {
    const angle = (t * 1.8 + s * Math.PI / 3) % (Math.PI * 2);
    ctx.save(); ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r * 0.18, cy + Math.sin(angle) * r * 0.12);
    ctx.bezierCurveTo(
      cx + Math.cos(angle + 0.7) * r * 0.55, cy + Math.sin(angle + 0.7) * r * 0.4,
      cx + Math.cos(angle + 1.3) * r * 0.7, cy + Math.sin(angle + 1.3) * r * 0.52,
      cx + Math.cos(angle + 2.0) * r * 0.6, cy + Math.sin(angle + 2.0) * r * 0.44
    );
    ctx.stroke(); ctx.restore();
  }

  // Sand particles
  for (let p = 0; p < 14; p++) {
    const a = (t * 2.2 + p * 0.45) % (Math.PI * 2);
    const d = r * (0.18 + (p % 3) * 0.22) * (0.85 + 0.15 * Math.sin(a * 2));
    ctx.save(); ctx.globalAlpha = 0.65;
    ctx.fillStyle = p % 3 === 0 ? "#fde68a" : "#f59e0b";
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // "Eye" center (calmer)
  ctx.save(); ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSnake(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);
  const sw = Math.sin(t * 1.2) * r * 0.06; // slow sway

  // Coiled body (draw back coils first)
  const bodyW = r * 0.14;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const coilColors = ["#92400e", "#78350f", "#a16207"];

  // Outer coil
  ctx.strokeStyle = "#78350f"; ctx.lineWidth = bodyW * 2;
  ctx.beginPath();
  ctx.arc(cx + sw * 0.5, cy + r * 0.12, r * 0.5, 0.15, Math.PI * 1.88);
  ctx.stroke();

  // Diamond pattern on coil
  ctx.strokeStyle = "#451a03"; ctx.lineWidth = bodyW * 0.6;
  for (let d = 0; d < 6; d++) {
    const da = 0.15 + d * (Math.PI * 1.73 / 6);
    const dx = cx + sw * 0.5 + Math.cos(da) * r * 0.5;
    const dy = cy + r * 0.12 + Math.sin(da) * r * 0.5;
    ctx.beginPath(); ctx.arc(dx, dy, bodyW * 0.8, 0, Math.PI * 2); ctx.stroke();
  }

  // Inner coil
  ctx.strokeStyle = "#a16207"; ctx.lineWidth = bodyW * 1.8;
  ctx.beginPath();
  ctx.arc(cx + sw * 0.3, cy + r * 0.15, r * 0.28, 0.3, Math.PI * 1.75);
  ctx.stroke();

  // Head (raised)
  const headX = cx + r * 0.52 + sw, headY = cy - r * 0.28;
  ctx.fillStyle = "#78350f"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.ellipse(headX, headY, r * 0.2, r * 0.14, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Neck connecting to coil
  ctx.strokeStyle = "#78350f"; ctx.lineWidth = bodyW * 1.8;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.44 + sw * 0.5, cy + r * 0.04);
  ctx.quadraticCurveTo(cx + r * 0.48 + sw * 0.7, cy - r * 0.14, headX - r * 0.08, headY + r * 0.1);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = "#fde047"; ctx.shadowColor = "#fde047"; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.arc(headX + r * 0.1, headY - r * 0.04, r * 0.055, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111"; ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(headX + r * 0.12, headY - r * 0.05, r * 0.032, 0, Math.PI * 2); ctx.fill();

  // Forked tongue
  const tonguePh = Math.sin(t * 4) > 0;
  if (tonguePh) {
    ctx.strokeStyle = "#ef4444"; ctx.lineWidth = Math.max(1.5, r * 0.04);
    ctx.beginPath(); ctx.moveTo(headX + r * 0.17, headY + r * 0.03);
    ctx.lineTo(headX + r * 0.32, headY + r * 0.03); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(headX + r * 0.32, headY + r * 0.03);
    ctx.lineTo(headX + r * 0.4, headY - r * 0.04); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(headX + r * 0.32, headY + r * 0.03);
    ctx.lineTo(headX + r * 0.4, headY + r * 0.1); ctx.stroke();
  }
  void coilColors;
}

function drawScorpion(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);
  const alert = Math.sin(t * 2) * 0.05; // subtle breathing

  // Body segments (abdomen)
  const segments: [number, number, number, number][] = [
    [cx - r * 0.08, cy + r * 0.2, r * 0.26, r * 0.2],
    [cx - r * 0.08, cy + r * 0.38, r * 0.22, r * 0.17],
    [cx - r * 0.08, cy + r * 0.52, r * 0.18, r * 0.14],
  ];
  ctx.fillStyle = "#78350f"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  segments.forEach(([sx, sy, sw, sh]) => {
    ctx.beginPath(); ctx.ellipse(sx as number, sy as number, sw as number, (sh as number) + alert * r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });

  // Cephalothorax (main body)
  ctx.beginPath(); ctx.ellipse(cx - r * 0.08, cy + r * 0.03, r * 0.32, r * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Claws (left and right)
  ctx.strokeStyle = "#92400e"; ctx.lineWidth = Math.max(2, r * 0.07);
  const clawSnap = Math.sin(t * 2.5) * r * 0.06;
  [-1, 1].forEach(side => {
    const armX = cx + side * r * 0.52;
    // Arm
    ctx.beginPath(); ctx.moveTo(cx + side * r * 0.28, cy + r * 0.04); ctx.lineTo(armX, cy - r * 0.12); ctx.stroke();
    // Claw (two fingers)
    ctx.strokeStyle = "#78350f"; ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.beginPath(); ctx.moveTo(armX, cy - r * 0.12); ctx.lineTo(armX + side * r * 0.22, cy - r * 0.22 - clawSnap * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(armX, cy - r * 0.12); ctx.lineTo(armX + side * r * 0.2, cy - r * 0.05 + clawSnap * 0.5); ctx.stroke();
    ctx.strokeStyle = "#92400e"; ctx.lineWidth = Math.max(2, r * 0.07);
  });

  // Tail with stinger (curved upward)
  const tailT = t * 1.3;
  ctx.strokeStyle = "#78350f"; ctx.lineWidth = Math.max(2.5, r * 0.09); ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.08, cy + r * 0.6);
  ctx.bezierCurveTo(cx + r * 0.35, cy + r * 0.7, cx + r * 0.65, cy + r * 0.3, cx + r * 0.5, cy - r * 0.28 + Math.sin(tailT) * r * 0.05);
  ctx.stroke();
  // Stinger tip
  ctx.fillStyle = "#ef4444"; ctx.strokeStyle = "#991b1b"; ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.5, cy - r * 0.28 + Math.sin(tailT) * r * 0.05);
  ctx.lineTo(cx + r * 0.65, cy - r * 0.46 + Math.sin(tailT) * r * 0.05);
  ctx.lineTo(cx + r * 0.44, cy - r * 0.44 + Math.sin(tailT) * r * 0.05);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Eyes (4)
  ctx.fillStyle = "#fde047";
  [[-r * 0.1, -r * 0.06], [r * 0.06, -r * 0.06], [-r * 0.18, -r * 0.02], [r * 0.14, -r * 0.02]].forEach(([ex, ey]) => {
    ctx.beginPath(); ctx.arc(cx + (ex as number) - r * 0.08, cy + (ey as number) + r * 0.02, r * 0.05, 0, Math.PI * 2); ctx.fill();
  });

  // 4 pairs of legs
  ctx.strokeStyle = "#92400e"; ctx.lineWidth = Math.max(1.5, r * 0.045);
  [-1, 1].forEach(side => {
    for (let leg = 0; leg < 4; leg++) {
      const ly = cy + leg * r * 0.08;
      const ls = Math.sin(t * 3 + leg * 0.5) * r * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx + side * r * 0.28, ly + r * 0.06);
      ctx.lineTo(cx + side * r * 0.55, ly - r * 0.04 + (side > 0 ? ls : -ls));
      ctx.lineTo(cx + side * r * 0.72, ly + r * 0.18 + (side > 0 ? ls : -ls));
      ctx.stroke();
    }
  });
}

function drawHeatWaves(ctx: C, cx: number, cy: number, r: number, t: number) {
  // Ground (cracked)
  ctx.fillStyle = "#c2830a";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.6, r * 0.88, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  // Cracks
  ctx.strokeStyle = "#7c3a0a"; ctx.lineWidth = Math.max(1, r * 0.03);
  [[cx - r * 0.3, cy + r * 0.55, cx, cy + r * 0.68], [cx, cy + r * 0.58, cx + r * 0.35, cy + r * 0.7]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1 as number, y1 as number); ctx.lineTo(x2 as number, y2 as number); ctx.stroke();
  });

  // Heat shimmer waves (rising wavy lines)
  const waveColors = ["rgba(251,146,60,0.8)", "rgba(252,211,77,0.7)", "rgba(255,170,50,0.65)"];
  for (let w = 0; w < 5; w++) {
    const wY = cy + r * 0.48 - w * r * 0.24;
    const wPhase = t * 2.2 + w * 0.6;
    ctx.save(); ctx.globalAlpha = 0.75 - w * 0.1;
    ctx.strokeStyle = waveColors[w % 3];
    ctx.lineWidth = Math.max(2, r * 0.05);
    ctx.beginPath();
    for (let x = 0; x <= 20; x++) {
      const px = cx - r * 0.85 + (x / 20) * r * 1.7;
      const py = wY + Math.sin((x / 20) * Math.PI * 3.5 + wPhase) * r * 0.055;
      if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.restore();
  }

  // Sun
  const sunR = r * 0.28;
  ctx.save(); ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 20;
  ctx.fillStyle = "#fde047";
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.55, sunR, 0, Math.PI * 2); ctx.fill();
  // Sun rays
  ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = Math.max(2, r * 0.05);
  for (let ray = 0; ray < 8; ray++) {
    const ra = (ray / 8) * Math.PI * 2 + t * 0.4;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ra) * sunR * 1.2, cy - r * 0.55 + Math.sin(ra) * sunR * 1.2);
    ctx.lineTo(cx + Math.cos(ra) * sunR * 1.72, cy - r * 0.55 + Math.sin(ra) * sunR * 1.72);
    ctx.stroke();
  }
  ctx.restore();
}

function drawThornBush(ctx: C, cx: number, cy: number, r: number, t: number) {
  const sway = Math.sin(t * 1.1) * r * 0.02;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(cx + sway * 0.3, cy + r * 0.6, r * 0.5, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();

  // Main bush body
  ctx.save(); ctx.translate(sway, 0);
  ctx.fillStyle = "#15803d"; ctx.strokeStyle = "#166534"; ctx.lineWidth = lw(r);
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.08, r * 0.48, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Inner darker layer
  ctx.fillStyle = "#14532d";
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.12, r * 0.3, 0, Math.PI * 2); ctx.fill();

  // Thorns (spikes around perimeter)
  ctx.fillStyle = "#854d0e"; ctx.strokeStyle = "#713f12"; ctx.lineWidth = Math.max(1, r * 0.03);
  for (let th = 0; th < 14; th++) {
    const ta = (th / 14) * Math.PI * 2 + t * 0.08;
    const tx = cx + Math.cos(ta) * r * 0.46;
    const ty = cy + r * 0.08 + Math.sin(ta) * r * 0.46;
    const tx2 = cx + Math.cos(ta) * r * 0.72;
    const ty2 = cy + r * 0.08 + Math.sin(ta) * r * 0.62;
    ctx.beginPath();
    ctx.moveTo(tx + Math.cos(ta + 0.35) * r * 0.1, ty + Math.sin(ta + 0.35) * r * 0.1);
    ctx.lineTo(tx2, ty2);
    ctx.lineTo(tx + Math.cos(ta - 0.35) * r * 0.1, ty + Math.sin(ta - 0.35) * r * 0.1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // A few berries (red, dangerous looking)
  ctx.fillStyle = "#dc2626";
  [[-r * 0.15, -r * 0.2], [r * 0.18, -r * 0.12], [r * 0.0, r * 0.04]].forEach(([bx, by]) => {
    ctx.beginPath(); ctx.arc(cx + (bx as number), cy + r * 0.08 + (by as number), r * 0.06, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

// ── HUMAN IMPACT HAZARDS ──────────────────────────────────────────────────────
function drawFactory(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);

  // Building body
  ctx.fillStyle = "#374151"; ctx.strokeStyle = "#111827"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.rect(cx - r * 0.62, cy - r * 0.1, r * 1.24, r * 0.72); ctx.fill(); ctx.stroke();

  // Roof detail
  ctx.fillStyle = "#4b5563";
  ctx.beginPath(); ctx.rect(cx - r * 0.62, cy - r * 0.18, r * 1.24, r * 0.12); ctx.fill(); ctx.stroke();

  // Windows
  ctx.fillStyle = "#fde047";
  [[cx - r * 0.42, cy + r * 0.1], [cx, cy + r * 0.1], [cx + r * 0.38, cy + r * 0.1]].forEach(([wx, wy]) => {
    ctx.beginPath(); ctx.rect((wx as number) - r * 0.1, (wy as number) - r * 0.1, r * 0.2, r * 0.18); ctx.fill();
    ctx.strokeStyle = "#111827"; ctx.lineWidth = Math.max(1, r * 0.025); ctx.stroke();
  });

  // Door
  ctx.fillStyle = "#1f2937";
  ctx.beginPath(); ctx.rect(cx - r * 0.1, cy + r * 0.32, r * 0.2, r * 0.28); ctx.fill();

  // Smokestacks
  const chimneyData: [number, string][] = [[cx - r * 0.35, "#4b5563"], [cx + r * 0.28, "#374151"]];
  chimneyData.forEach(([chX, chCol]) => {
    ctx.fillStyle = chCol as string; ctx.strokeStyle = "#111827"; ctx.lineWidth = L;
    ctx.beginPath(); ctx.rect((chX as number) - r * 0.1, cy - r * 0.82, r * 0.2, r * 0.72); ctx.fill(); ctx.stroke();
    // Top ring
    ctx.beginPath(); ctx.ellipse(chX as number, cy - r * 0.82, r * 0.12, r * 0.04, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });

  // Smoke from each chimney
  smokeCloud(ctx, cx - r * 0.35, cy - r * 0.85, r * 0.6, t, "#6b7280");
  smokeCloud(ctx, cx + r * 0.28, cy - r * 0.85, r * 0.55, t * 1.2 + 1.5, "#9ca3af");

  // Pollution glow
  ctx.save(); ctx.globalAlpha = 0.18 + 0.07 * Math.sin(t * 1.5);
  ctx.shadowColor = "#a3e635"; ctx.shadowBlur = 18;
  ctx.strokeStyle = "#84cc16"; ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.2, r * 0.8, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawBulldozer(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);
  const treadAnim = (t * 2.5) % 1; // tread rolling animation

  // Treads
  ctx.fillStyle = "#292524"; ctx.strokeStyle = "#111827"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.roundRect(cx - r * 0.72, cy + r * 0.26, r * 1.44, r * 0.26, r * 0.06); ctx.fill(); ctx.stroke();
  // Tread marks
  ctx.strokeStyle = "#44403c"; ctx.lineWidth = Math.max(1, r * 0.03);
  for (let tm = 0; tm < 8; tm++) {
    const tmx = cx - r * 0.72 + ((treadAnim + tm / 8) % 1) * r * 1.44;
    if (tmx > cx - r * 0.72 && tmx < cx + r * 0.72) {
      ctx.beginPath(); ctx.moveTo(tmx, cy + r * 0.26); ctx.lineTo(tmx, cy + r * 0.52); ctx.stroke();
    }
  }
  // Wheels
  ctx.fillStyle = "#44403c"; ctx.strokeStyle = "#111827"; ctx.lineWidth = L;
  [cx - r * 0.52, cx + r * 0.52].forEach(wx => {
    ctx.beginPath(); ctx.arc(wx, cy + r * 0.4, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });

  // Body / cab
  ctx.fillStyle = "#ca8a04"; ctx.strokeStyle = "#111827"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.roundRect(cx - r * 0.28, cy - r * 0.42, r * 0.56, r * 0.7, r * 0.05); ctx.fill(); ctx.stroke();

  // Cab top / windshield
  ctx.fillStyle = "#a16207";
  ctx.beginPath(); ctx.roundRect(cx - r * 0.24, cy - r * 0.52, r * 0.48, r * 0.18, r * 0.04); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#67e8f9"; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.rect(cx - r * 0.2, cy - r * 0.48, r * 0.4, r * 0.1); ctx.fill();
  ctx.globalAlpha = 1;

  // Front blade
  ctx.fillStyle = "#6b7280"; ctx.strokeStyle = "#374151"; ctx.lineWidth = L;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.72, cy - r * 0.05);
  ctx.lineTo(cx - r * 0.82, cy + r * 0.12);
  ctx.lineTo(cx - r * 0.82, cy + r * 0.28);
  ctx.lineTo(cx - r * 0.72, cy + r * 0.28);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Exhaust pipe + smoke
  ctx.fillStyle = "#374151"; ctx.strokeStyle = "#111827"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.rect(cx + r * 0.18, cy - r * 0.62, r * 0.08, r * 0.22); ctx.fill(); ctx.stroke();
  smokeCloud(ctx, cx + r * 0.22, cy - r * 0.64, r * 0.35, t, "#6b7280");

  // Dust cloud from blade
  for (let d = 0; d < 4; d++) {
    const dp = (t * 1.5 + d * 0.25) % 1;
    ctx.save(); ctx.globalAlpha = (1 - dp) * 0.55;
    ctx.fillStyle = "#d97706";
    ctx.beginPath(); ctx.arc(cx - r * 0.9 - dp * r * 0.3, cy + r * 0.22 - dp * r * 0.2, r * (0.08 + dp * 0.14), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawLandfill(ctx: C, cx: number, cy: number, r: number, t: number) {
  // Ground mound
  const g = ctx.createRadialGradient(cx, cy + r * 0.4, 0, cx, cy + r * 0.3, r * 0.88);
  g.addColorStop(0, "#4b5563"); g.addColorStop(1, "#1f2937");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.4, r * 0.85, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();

  // Trash items
  const items: [number, number, number, number, string][] = [
    [cx - r * 0.52, cy + r * 0.32, r * 0.24, r * 0.16, "#3b82f6"],
    [cx - r * 0.22, cy + r * 0.18, r * 0.2, r * 0.26, "#22c55e"],
    [cx + r * 0.18, cy + r * 0.24, r * 0.22, r * 0.18, "#ef4444"],
    [cx + r * 0.46, cy + r * 0.3, r * 0.2, r * 0.2, "#f59e0b"],
    [cx - r * 0.36, cy + r * 0.52, r * 0.28, r * 0.14, "#9ca3af"],
    [cx + r * 0.08, cy + r * 0.48, r * 0.16, r * 0.24, "#e879f9"],
    [cx + r * 0.4, cy + r * 0.5, r * 0.18, r * 0.12, "#06b6d4"],
  ];
  ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = Math.max(1, r * 0.025);
  items.forEach(([ix, iy, iw, ih, col]) => {
    ctx.fillStyle = col as string;
    ctx.beginPath(); ctx.roundRect((ix as number) - (iw as number) / 2, (iy as number) - (ih as number) / 2, iw as number, ih as number, r * 0.03);
    ctx.fill(); ctx.stroke();
  });

  // Flies orbiting
  ctx.fillStyle = "#111";
  for (let f = 0; f < 5; f++) {
    const fa = (t * 3.5 + f * (Math.PI * 2 / 5)) % (Math.PI * 2);
    const fr = r * (0.32 + f * 0.06);
    const fx = cx + Math.cos(fa) * fr;
    const fy = cy + r * 0.18 + Math.sin(fa) * fr * 0.4;
    ctx.beginPath(); ctx.arc(fx, fy, r * 0.04, 0, Math.PI * 2); ctx.fill();
    // Wing blur
    ctx.save(); ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#d1d5db";
    ctx.beginPath(); ctx.ellipse(fx - r * 0.04, fy - r * 0.02, r * 0.06, r * 0.03, fa + 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Stench lines
  ctx.save(); ctx.strokeStyle = "#84cc16"; ctx.lineWidth = Math.max(1.5, r * 0.03);
  for (let sl = 0; sl < 3; sl++) {
    const sp = (t * 1.0 + sl * 0.33) % 1;
    ctx.globalAlpha = (1 - sp) * 0.55;
    ctx.beginPath();
    const sx = cx + (sl - 1) * r * 0.28;
    ctx.moveTo(sx, cy - sp * r * 0.5);
    ctx.quadraticCurveTo(sx + r * 0.1, cy - r * 0.15 - sp * r * 0.4, sx + r * 0.05, cy - r * 0.38 - sp * r * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPollutionCloud(ctx: C, cx: number, cy: number, r: number, t: number) {
  // Purple-grey cloud
  const cloudBlobs: [number, number, number][] = [
    [cx - r * 0.28, cy - r * 0.05, r * 0.4],
    [cx + r * 0.28, cy - r * 0.05, r * 0.38],
    [cx, cy - r * 0.35, r * 0.42],
    [cx - r * 0.52, cy + r * 0.08, r * 0.3],
    [cx + r * 0.52, cy + r * 0.08, r * 0.3],
    [cx, cy + r * 0.1, r * 0.36],
  ];
  const pulse = 1 + 0.06 * Math.sin(t * 1.8);
  ctx.shadowColor = "#7c3aed"; ctx.shadowBlur = 16;
  cloudBlobs.forEach(([bx, by, br]) => {
    const cloudG = ctx.createRadialGradient(bx as number, by as number, 0, bx as number, by as number, (br as number) * pulse);
    cloudG.addColorStop(0, "#4b5563");
    cloudG.addColorStop(0.7, "#374151");
    cloudG.addColorStop(1, "#1f2937");
    ctx.fillStyle = cloudG;
    ctx.beginPath(); ctx.arc(bx as number, by as number, (br as number) * pulse, 0, Math.PI * 2); ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Toxic green outline
  ctx.save(); ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 2);
  ctx.strokeStyle = "#4ade80"; ctx.lineWidth = Math.max(2, r * 0.055);
  ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.08, r * 0.88, r * 0.52, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Drips falling
  ctx.strokeStyle = "#6d28d9"; ctx.lineWidth = Math.max(2, r * 0.05); ctx.lineCap = "round";
  for (let d = 0; d < 4; d++) {
    const dp = (t * 1.4 + d * 0.25) % 1;
    const dx = cx - r * 0.45 + d * r * 0.3;
    const dy = cy + r * 0.18 + dp * r * 0.58;
    ctx.save(); ctx.globalAlpha = (1 - dp * 0.8) * 0.85;
    ctx.beginPath(); ctx.moveTo(dx, cy + r * 0.18); ctx.lineTo(dx, dy); ctx.stroke();
    // Droplet
    ctx.fillStyle = "#7c3aed";
    ctx.beginPath(); ctx.arc(dx, dy, r * 0.055, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Skull symbol (simplified)
  ctx.save(); ctx.translate(cx, cy - r * 0.08);
  ctx.fillStyle = "rgba(209,213,219,0.55)";
  ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(55,65,81,0.7)";
  ctx.beginPath(); ctx.arc(-r * 0.09, -r * 0.06, r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.09, -r * 0.06, r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(55,65,81,0.7)"; ctx.lineWidth = Math.max(2, r * 0.055);
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, r * 0.1); ctx.lineTo(-r * 0.1, r * 0.16);
  ctx.moveTo(0, r * 0.1); ctx.lineTo(0, r * 0.16);
  ctx.moveTo(r * 0.1, r * 0.1); ctx.lineTo(r * 0.1, r * 0.16);
  ctx.stroke();
  ctx.restore();
}

function drawConstruction(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);

  // Base platform
  ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.rect(cx - r * 0.78, cy + r * 0.5, r * 1.56, r * 0.18); ctx.fill(); ctx.stroke();

  // Warning stripes
  const stripeW = r * 0.22;
  for (let s = 0; s < 7; s++) {
    ctx.fillStyle = s % 2 === 0 ? "#ca8a04" : "#111827";
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - r * 0.78, cy + r * 0.5, r * 1.56, r * 0.18); ctx.clip();
    ctx.beginPath(); ctx.rect(cx - r * 0.78 + s * stripeW, cy + r * 0.5, stripeW, r * 0.18); ctx.fill();
    ctx.restore();
  }

  // Scaffolding poles
  ctx.strokeStyle = "#6b7280"; ctx.lineWidth = Math.max(2.5, r * 0.07);
  [[-r * 0.55, cx - r * 0.55], [r * 0.55, cx + r * 0.55]].forEach(([_, px]) => {
    ctx.beginPath(); ctx.moveTo(px as number, cy + r * 0.5); ctx.lineTo(px as number, cy - r * 0.75); ctx.stroke();
  });
  // Cross braces
  ctx.lineWidth = Math.max(1.5, r * 0.04); ctx.strokeStyle = "#9ca3af";
  [cy + r * 0.28, cy + r * 0.02, cy - r * 0.3].forEach(by => {
    ctx.beginPath(); ctx.moveTo(cx - r * 0.55, by); ctx.lineTo(cx + r * 0.55, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.55, by); ctx.lineTo(cx + r * 0.55, by + r * 0.3); ctx.stroke();
  });

  // Crane arm
  const craneRot = Math.sin(t * 0.6) * 0.18;
  ctx.save(); ctx.translate(cx, cy - r * 0.75); ctx.rotate(craneRot);
  ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = Math.max(2.5, r * 0.07);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.7, -r * 0.15); ctx.stroke();
  ctx.strokeStyle = "#6b7280"; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.15); ctx.lineTo(r * 0.7, r * 0.22); ctx.stroke();
  // Hook
  ctx.beginPath(); ctx.arc(r * 0.7, r * 0.25, r * 0.06, 0, Math.PI); ctx.stroke();
  ctx.restore();

  // Hard hat sign
  ctx.fillStyle = "#fde047"; ctx.strokeStyle = "#111827"; ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.22, r * 0.18, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(cx - r * 0.22, cy - r * 0.22, r * 0.44, r * 0.07); ctx.fill(); ctx.stroke();
}

// ── RESTORATION BONUSES ────────────────────────────────────────────────────────
function drawTreePlanting(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);

  // Ground
  ctx.fillStyle = "#854d0e"; ctx.strokeStyle = "#713f12"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.6, r * 0.7, r * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Person (simple figure on right)
  const personX = cx + r * 0.38;
  ctx.fillStyle = "#1d4ed8"; // shirt
  ctx.beginPath(); ctx.ellipse(personX, cy + r * 0.15, r * 0.16, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fde68a"; // head
  ctx.beginPath(); ctx.arc(personX, cy - r * 0.12, r * 0.14, 0, Math.PI * 2); ctx.fill();
  // Arm extended (planting)
  ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.moveTo(personX - r * 0.16, cy + r * 0.12); ctx.lineTo(cx + r * 0.02, cy + r * 0.35); ctx.stroke();

  // Shovel
  ctx.strokeStyle = "#92400e"; ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath(); ctx.moveTo(cx + r * 0.04, cy + r * 0.32); ctx.lineTo(cx + r * 0.1, cy + r * 0.62); ctx.stroke();
  ctx.fillStyle = "#6b7280"; ctx.strokeStyle = "#374151"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.ellipse(cx + r * 0.1, cy + r * 0.65, r * 0.1, r * 0.07, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Seedling (left side, growing)
  const growH = r * (0.38 + 0.06 * Math.sin(t * 1.5));
  ctx.strokeStyle = "#15803d"; ctx.lineWidth = Math.max(2.5, r * 0.07);
  ctx.beginPath(); ctx.moveTo(cx - r * 0.28, cy + r * 0.52); ctx.lineTo(cx - r * 0.28, cy + r * 0.52 - growH); ctx.stroke();
  // Leaves
  ctx.fillStyle = "#22c55e";
  [[-r * 0.14, -r * 0.1], [r * 0.12, -r * 0.12], [-r * 0.1, -r * 0.26], [r * 0.1, -r * 0.28]].forEach(([lx, ly]) => {
    ctx.beginPath(); ctx.ellipse(cx - r * 0.28 + (lx as number), cy + r * 0.52 - growH * 0.6 + (ly as number), r * 0.1, r * 0.055, (lx as number) > 0 ? 0.4 : -0.4, 0, Math.PI * 2); ctx.fill();
  });

  // Sparkles / growth effect
  sparks(ctx, cx - r * 0.28, cy + r * 0.52 - growH, r * 0.4, 4, t, "#4ade80", "#fbbf24");
}

function drawAnimalRescue(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);

  // Shelter / house shape
  ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  // Roof
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.58, cy + r * 0.04);
  ctx.lineTo(cx, cy - r * 0.48);
  ctx.lineTo(cx + r * 0.58, cy + r * 0.04);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Walls
  ctx.fillStyle = "#d97706";
  ctx.beginPath(); ctx.rect(cx - r * 0.48, cy + r * 0.04, r * 0.96, r * 0.54); ctx.fill(); ctx.stroke();
  // Door arch (animal entrance)
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.3, r * 0.2, Math.PI, 0);
  ctx.lineTo(cx + r * 0.2, cy + r * 0.58); ctx.lineTo(cx - r * 0.2, cy + r * 0.58); ctx.closePath();
  ctx.fill();

  // Animal inside (small rabbit/bird peeking)
  const peek = Math.sin(t * 1.8) * r * 0.04;
  ctx.fillStyle = "#f3f4f6";
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.3 + peek, r * 0.12, 0, Math.PI * 2); ctx.fill();
  // Ears
  ctx.fillStyle = "#f9a8d4";
  ctx.beginPath(); ctx.ellipse(cx - r * 0.08, cy + r * 0.15 + peek, r * 0.04, r * 0.1, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + r * 0.08, cy + r * 0.15 + peek, r * 0.04, r * 0.1, 0.2, 0, Math.PI * 2); ctx.fill();

  // Floating hearts
  for (let h = 0; h < 3; h++) {
    const hp = (t * 1.2 + h * 0.33) % 1;
    const hx = cx - r * 0.3 + h * r * 0.3;
    const hy = cy - r * 0.55 - hp * r * 0.55;
    ctx.save(); ctx.globalAlpha = (1 - hp) * 0.85;
    ctx.fillStyle = "#f43f5e"; ctx.translate(hx, hy); const hs = r * (0.06 + h * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, hs * 0.4);
    ctx.bezierCurveTo(-hs, -hs * 0.2, -hs * 1.6, hs * 0.6, 0, hs * 1.4);
    ctx.bezierCurveTo(hs * 1.6, hs * 0.6, hs, -hs * 0.2, 0, hs * 0.4);
    ctx.fill(); ctx.restore();
  }

  // "+" medical cross on roof
  ctx.fillStyle = "#f43f5e";
  ctx.beginPath(); ctx.rect(cx - r * 0.06, cy - r * 0.38, r * 0.12, r * 0.22); ctx.fill();
  ctx.beginPath(); ctx.rect(cx - r * 0.12, cy - r * 0.3, r * 0.24, r * 0.1); ctx.fill();
}

function drawRiverCleanup(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);

  // River
  ctx.fillStyle = "#0284c7";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.42, r * 0.85, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  // Clean sparkles in water
  ctx.strokeStyle = "#7dd3fc"; ctx.lineWidth = Math.max(1, r * 0.04);
  wavyLine(ctx, cx - r * 0.8, cy + r * 0.42, cx + r * 0.8, r * 0.05, 3, t);
  for (let sp = 0; sp < 4; sp++) {
    const sph = (t * 2 + sp * 0.25) % 1;
    ctx.save(); ctx.globalAlpha = sph < 0.5 ? sph * 2 : (1 - sph) * 2;
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath(); ctx.arc(cx - r * 0.5 + sp * r * 0.34, cy + r * 0.42, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Trash being scooped
  ctx.fillStyle = "#ef4444"; ctx.strokeStyle = "#111"; ctx.lineWidth = L * 0.6;
  ctx.beginPath(); ctx.roundRect(cx + r * 0.3, cy + r * 0.35, r * 0.14, r * 0.16, r * 0.03); ctx.fill(); ctx.stroke();

  // Person with net
  const personX = cx - r * 0.1;
  ctx.fillStyle = "#16a34a"; // jacket
  ctx.beginPath(); ctx.ellipse(personX, cy - r * 0.04, r * 0.18, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fde68a"; // head
  ctx.beginPath(); ctx.arc(personX, cy - r * 0.36, r * 0.14, 0, Math.PI * 2); ctx.fill();
  // Hat
  ctx.fillStyle = "#ca8a04";
  ctx.beginPath(); ctx.ellipse(personX, cy - r * 0.48, r * 0.18, r * 0.05, 0, 0, Math.PI * 2); ctx.fill();

  // Net (extended arm)
  ctx.strokeStyle = "#92400e"; ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath(); ctx.moveTo(personX + r * 0.18, cy - r * 0.06); ctx.lineTo(cx + r * 0.35, cy + r * 0.3); ctx.stroke();
  // Net mesh
  ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.arc(cx + r * 0.36, cy + r * 0.32, r * 0.18, 0, Math.PI * 2); ctx.stroke();

  // Green check / success
  sparks(ctx, personX, cy - r * 0.55, r * 0.4, 4, t, "#4ade80", "#86efac");
}

function drawHabitatArea(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);

  // Protected zone marker (green boundary)
  ctx.save(); ctx.setLineDash([r * 0.12, r * 0.08]);
  ctx.strokeStyle = "#16a34a"; ctx.lineWidth = Math.max(2.5, r * 0.07);
  ctx.beginPath(); ctx.roundRect(cx - r * 0.82, cy - r * 0.75, r * 1.64, r * 1.38, r * 0.12); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // Ground
  ctx.fillStyle = "#15803d";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.52, r * 0.72, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();

  // Multiple small plants growing
  const plants: [number, number, number][] = [
    [cx - r * 0.42, cy + r * 0.4, r * 0.28],
    [cx, cy + r * 0.25, r * 0.38],
    [cx + r * 0.42, cy + r * 0.38, r * 0.3],
    [cx - r * 0.18, cy + r * 0.44, r * 0.22],
  ];
  plants.forEach(([px, py, ph], i) => {
    const growPulse = ph * (1 + 0.04 * Math.sin(t * 1.5 + i));
    ctx.strokeStyle = "#15803d"; ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.beginPath(); ctx.moveTo(px as number, py as number); ctx.lineTo(px as number, (py as number) - growPulse); ctx.stroke();
    ctx.fillStyle = i % 2 === 0 ? "#22c55e" : "#4ade80";
    ctx.beginPath(); ctx.arc(px as number, (py as number) - growPulse, growPulse * 0.45, 0, Math.PI * 2); ctx.fill();
  });

  // Butterfly
  const bfA = t * 1.8;
  const bfX = cx + Math.sin(bfA) * r * 0.38, bfY = cy - r * 0.35 + Math.sin(bfA * 1.3) * r * 0.18;
  const bfWing = Math.sin(t * 5.5) * 0.5;
  ctx.save(); ctx.translate(bfX, bfY);
  ctx.fillStyle = "#f97316"; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.ellipse(-r * 0.08, bfWing * r * 0.12, r * 0.12, r * 0.07, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.08, bfWing * r * 0.12, r * 0.12, r * 0.07, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111"; ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Sparkles
  sparks(ctx, cx, cy - r * 0.1, r * 0.6, 5, t, "#4ade80", "#fbbf24");
}

function drawSolarPanels(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);

  // Panel frame
  ctx.fillStyle = "#1e3a5f"; ctx.strokeStyle = "#1e40af"; ctx.lineWidth = L;
  // Array of 6 panels (2x3)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const px = cx - r * 0.58 + col * r * 0.42;
      const py = cy - r * 0.28 + row * r * 0.44;
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath(); ctx.rect(px, py, r * 0.38, r * 0.38); ctx.fill(); ctx.stroke();
      // Cell dividers
      ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = Math.max(1, r * 0.025);
      ctx.beginPath(); ctx.moveTo(px + r * 0.19, py); ctx.lineTo(px + r * 0.19, py + r * 0.38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py + r * 0.19); ctx.lineTo(px + r * 0.38, py + r * 0.19); ctx.stroke();
      // Glint
      const glint = (t * 0.7 + row * 0.3 + col * 0.2) % 1;
      ctx.save(); ctx.globalAlpha = glint < 0.5 ? glint * 0.5 : (1 - glint) * 0.5;
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath(); ctx.rect(px + r * 0.04, py + r * 0.04, r * 0.12, r * 0.08); ctx.fill();
      ctx.restore();
    }
  }

  // Sun above
  ctx.save(); ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 14;
  ctx.fillStyle = "#fde047";
  ctx.beginPath(); ctx.arc(cx + r * 0.58, cy - r * 0.65, r * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = Math.max(1.5, r * 0.04);
  for (let ray = 0; ray < 6; ray++) {
    const ra = (ray / 6) * Math.PI * 2 + t * 0.5;
    const r1 = r * 0.24, r2 = r * 0.36;
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.58 + Math.cos(ra) * r1, cy - r * 0.65 + Math.sin(ra) * r1);
    ctx.lineTo(cx + r * 0.58 + Math.cos(ra) * r2, cy - r * 0.65 + Math.sin(ra) * r2);
    ctx.stroke();
  }
  ctx.restore();

  // Ground mount
  ctx.fillStyle = "#374151"; ctx.strokeStyle = "#111827"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.rect(cx - r * 0.62, cy + r * 0.18, r * 1.24, r * 0.1); ctx.fill(); ctx.stroke();
  // Legs
  ctx.beginPath(); ctx.moveTo(cx - r * 0.35, cy + r * 0.28); ctx.lineTo(cx - r * 0.35, cy + r * 0.55); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + r * 0.35, cy + r * 0.28); ctx.lineTo(cx + r * 0.35, cy + r * 0.55); ctx.stroke();
}

// ── ZONE BONUS OBJECTS ────────────────────────────────────────────────────────
function drawHealthyTree(ctx: C, cx: number, cy: number, r: number, t: number) {
  const sway = Math.sin(t * 1.0) * r * 0.025;
  const L = lw(r);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.ellipse(cx + sway * 0.3, cy + r * 0.64, r * 0.44, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();

  // Trunk
  ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.roundRect(cx - r * 0.1 + sway * 0.3, cy + r * 0.2, r * 0.2, r * 0.46, r * 0.04); ctx.fill(); ctx.stroke();
  // Bark lines
  ctx.strokeStyle = "#78350f"; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(cx - r * 0.02 + sway * 0.3, cy + r * 0.25); ctx.lineTo(cx + r * 0.04 + sway * 0.3, cy + r * 0.55); ctx.stroke();

  // Canopy (3 layered circles)
  ctx.save(); ctx.translate(sway, 0);
  ctx.shadowColor = "#15803d"; ctx.shadowBlur = 10;
  [
    [cx, cy - r * 0.12, r * 0.56, "#15803d"],
    [cx - r * 0.3, cy + r * 0.05, r * 0.44, "#166534"],
    [cx + r * 0.3, cy + r * 0.05, r * 0.42, "#14532d"],
    [cx, cy + r * 0.16, r * 0.5, "#166534"],
    [cx, cy - r * 0.32, r * 0.42, "#22c55e"],
  ].forEach(([tx, ty, tr, col]) => {
    ctx.fillStyle = col as string;
    ctx.beginPath(); ctx.arc(tx as number, ty as number, tr as number, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();

  // Bright fruits/flowers
  [[cx - r * 0.22, cy - r * 0.4], [cx + r * 0.2, cy - r * 0.28], [cx - r * 0.1, cy - r * 0.06], [cx + r * 0.28, cy + r * 0.08]].forEach(([fx, fy], i) => {
    ctx.fillStyle = ["#ef4444", "#fbbf24", "#f97316", "#a3e635"][i];
    ctx.beginPath(); ctx.arc((fx as number) + sway, fy as number, r * 0.07, 0, Math.PI * 2); ctx.fill();
  });

  // Sparkles
  sparks(ctx, cx + sway, cy - r * 0.38, r * 0.5, 4, t, "#4ade80", "#fbbf24");
}

function drawCoralReef(ctx: C, cx: number, cy: number, r: number, t: number) {
  // Water background
  ctx.fillStyle = "#0369a1";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.1, r * 0.88, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();

  // Corals
  const corals: [number, number, string, number][] = [
    [cx - r * 0.48, cy + r * 0.35, "#f43f5e", r * 0.42],
    [cx - r * 0.14, cy + r * 0.28, "#fb923c", r * 0.5],
    [cx + r * 0.22, cy + r * 0.32, "#fbbf24", r * 0.44],
    [cx + r * 0.54, cy + r * 0.36, "#e879f9", r * 0.38],
    [cx - r * 0.3, cy + r * 0.44, "#34d399", r * 0.36],
    [cx + r * 0.08, cy + r * 0.46, "#60a5fa", r * 0.4],
  ];
  corals.forEach(([cx2, cy2, col, ch], i) => {
    const coralSway = Math.sin(t * 1.4 + i * 0.7) * r * 0.04;
    ctx.save(); ctx.translate(coralSway, 0);
    ctx.strokeStyle = col as string; ctx.lineWidth = Math.max(2.5, r * 0.08); ctx.lineCap = "round";
    // Main branch
    ctx.beginPath(); ctx.moveTo(cx2 as number, cy2 as number); ctx.lineTo(cx2 as number, (cy2 as number) - (ch as number) * 0.7); ctx.stroke();
    // Side branches
    [-0.35, 0.35].forEach(ba => {
      ctx.beginPath();
      ctx.moveTo((cx2 as number), (cy2 as number) - (ch as number) * 0.4);
      ctx.lineTo((cx2 as number) + Math.cos(ba * Math.PI) * (ch as number) * 0.35, (cy2 as number) - (ch as number) * 0.7);
      ctx.stroke();
    });
    // Tips (round polyps)
    ctx.fillStyle = col as string; ctx.lineWidth = 0;
    [[cx2 as number, (cy2 as number) - (ch as number) * 0.7],
     [(cx2 as number) - (ch as number) * 0.35, (cy2 as number) - (ch as number) * 0.7],
     [(cx2 as number) + (ch as number) * 0.35, (cy2 as number) - (ch as number) * 0.7]].forEach(([ptx, pty]) => {
      ctx.beginPath(); ctx.arc(ptx as number, pty as number, r * 0.07, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  });

  // Fish
  const fishX = cx + Math.sin(t * 0.8) * r * 0.52, fishY = cy - r * 0.22 + Math.sin(t * 1.2) * r * 0.14;
  ctx.fillStyle = "#fbbf24"; ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath(); ctx.ellipse(fishX, fishY, r * 0.16, r * 0.09, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fishX - r * 0.14, fishY); ctx.lineTo(fishX - r * 0.26, fishY - r * 0.08); ctx.lineTo(fishX - r * 0.26, fishY + r * 0.08); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(fishX + r * 0.1, fishY - r * 0.02, r * 0.03, 0, Math.PI * 2); ctx.fill();

  // Bubbles
  for (let b = 0; b < 4; b++) {
    const bp = (t * 1.1 + b * 0.25) % 1;
    const bx = cx - r * 0.3 + b * r * 0.22;
    const by = cy + r * 0.42 - bp * r * 0.82;
    ctx.save(); ctx.globalAlpha = (1 - bp) * 0.7;
    ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = Math.max(1, r * 0.025);
    ctx.beginPath(); ctx.arc(bx, by, r * 0.04, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawOasis(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);
  const sway = Math.sin(t * 1.1) * r * 0.03;

  // Sandy ground
  ctx.fillStyle = "#d97706";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.58, r * 0.88, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();

  // Water pool
  ctx.fillStyle = "#0284c7";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.52, r * 0.55, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  // Pool sparkle
  ctx.strokeStyle = "#7dd3fc"; ctx.lineWidth = Math.max(1.5, r * 0.04);
  wavyLine(ctx, cx - r * 0.48, cy + r * 0.52, cx + r * 0.48, r * 0.04, 2, t);

  // Palm trunk
  ctx.strokeStyle = "#78350f"; ctx.lineWidth = Math.max(3, r * 0.11);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.06, cy + r * 0.44);
  ctx.bezierCurveTo(cx + r * 0.08, cy + r * 0.1, cx - r * 0.1, cy - r * 0.25, cx + sway, cy - r * 0.58);
  ctx.stroke();

  // Palm fronds
  const fronds: [number, number][] = [
    [-0.7, -0.28], [0.7, -0.28], [-0.4, -0.68], [0.4, -0.68], [0, -0.82], [-0.55, -0.52], [0.55, -0.52],
  ];
  ctx.strokeStyle = "#15803d"; ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = "round";
  fronds.forEach(([fx, fy]) => {
    const frondSway = Math.sin(t * 1.1 + (fx as number) * 3) * r * 0.04;
    ctx.beginPath();
    ctx.moveTo(cx + sway, cy - r * 0.58);
    ctx.bezierCurveTo(cx + sway + (fx as number) * r * 0.25, cy - r * 0.58 + (fy as number) * r * 0.25, cx + sway + (fx as number) * r * 0.55 + frondSway, cy - r * 0.58 + (fy as number) * r * 0.55 + frondSway, cx + sway + (fx as number) * r * 0.7 + frondSway, cy - r * 0.58 + (fy as number) * r * 0.7 + frondSway);
    ctx.stroke();
  });

  // Coconuts
  ctx.fillStyle = "#78350f"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  [[-r * 0.12, -r * 0.58], [r * 0.18, -r * 0.62], [r * 0.04, -r * 0.52]].forEach(([kx, ky]) => {
    ctx.beginPath(); ctx.arc(cx + (kx as number) + sway, cy + (ky as number), r * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
}

function drawGreenPark(ctx: C, cx: number, cy: number, r: number, t: number) {
  const L = lw(r);

  // Grass ground
  ctx.fillStyle = "#16a34a";
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.58, r * 0.88, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();

  // Park bench
  ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = L;
  ctx.beginPath(); ctx.roundRect(cx - r * 0.52, cy + r * 0.3, r * 1.04, r * 0.1, r * 0.03); ctx.fill(); ctx.stroke();
  // Legs
  ctx.beginPath(); ctx.rect(cx - r * 0.44, cy + r * 0.4, r * 0.08, r * 0.2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(cx + r * 0.36, cy + r * 0.4, r * 0.08, r * 0.2); ctx.fill(); ctx.stroke();

  // Small tree on left
  ctx.fillStyle = "#92400e"; ctx.strokeStyle = "#451a03"; ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.roundRect(cx - r * 0.62, cy + r * 0.08, r * 0.1, r * 0.5, r * 0.03); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#22c55e"; ctx.shadowColor = "#16a34a"; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(cx - r * 0.57, cy - r * 0.12, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Path / walkway
  ctx.fillStyle = "#d97706";
  ctx.beginPath(); ctx.ellipse(cx + r * 0.28, cy + r * 0.48, r * 0.22, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();

  // Flowers
  const flColors = ["#f43f5e", "#fb923c", "#fbbf24", "#e879f9"];
  [[cx + r * 0.44, cy + r * 0.38], [cx + r * 0.62, cy + r * 0.42], [cx + r * 0.54, cy + r * 0.52]].forEach(([fx, fy], i) => {
    const fSway = Math.sin(t * 1.8 + i) * r * 0.03;
    ctx.strokeStyle = "#15803d"; ctx.lineWidth = Math.max(1.5, r * 0.04);
    ctx.beginPath(); ctx.moveTo(fx as number, fy as number); ctx.lineTo((fx as number) + fSway, (fy as number) - r * 0.18); ctx.stroke();
    ctx.fillStyle = flColors[i % flColors.length];
    ctx.beginPath(); ctx.arc((fx as number) + fSway, (fy as number) - r * 0.18, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fde068";
    ctx.beginPath(); ctx.arc((fx as number) + fSway, (fy as number) - r * 0.18, r * 0.035, 0, Math.PI * 2); ctx.fill();
  });

  // Sparkles
  sparks(ctx, cx - r * 0.57, cy - r * 0.3, r * 0.35, 3, t, "#4ade80", "#fbbf24");
}

// ── Utility ────────────────────────────────────────────────────────────────────
function lerpColorStr(c1: string, c2: string, t: number): string {
  const h = (s: string) => { const h2 = s.replace("#", ""); return [parseInt(h2.slice(0,2),16),parseInt(h2.slice(2,4),16),parseInt(h2.slice(4,6),16)]; };
  const [r1,g1,b1] = h(c1); const [r2,g2,b2] = h(c2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

// ── Dispatch ───────────────────────────────────────────────────────────────────
const FOREST_HAZARDS = [drawWolf, drawTiger, drawForestFire, drawFallenTree, drawLoggingCamp];
const OCEAN_HAZARDS  = [drawShark, drawJellyfish, drawOilSpill, drawPlasticIsland, drawStormWaves];
const DESERT_HAZARDS = [drawSandstorm, drawSnake, drawScorpion, drawHeatWaves, drawThornBush];
const HUMAN_HAZARDS  = [drawFactory, drawBulldozer, drawLandfill, drawPollutionCloud, drawConstruction];
const RESTORE_HAZARDS = [drawFactory, drawOilSpill, drawPollutionCloud, drawLandfill, drawBulldozer];

const FOREST_BONUS  = [drawHealthyTree, drawTreePlanting, drawHealthyTree, drawAnimalRescue, drawHealthyTree];
const OCEAN_BONUS   = [drawCoralReef, drawRiverCleanup, drawCoralReef, drawAnimalRescue, drawCoralReef];
const DESERT_BONUS  = [drawOasis, drawTreePlanting, drawOasis, drawRiverCleanup, drawOasis];
const HUMAN_BONUS   = [drawGreenPark, drawTreePlanting, drawSolarPanels, drawAnimalRescue, drawGreenPark];
const RESTORE_BONUS = [drawTreePlanting, drawAnimalRescue, drawRiverCleanup, drawHabitatArea, drawSolarPanels];

export function drawEnvObject(
  ctx: C,
  cx: number, cy: number,
  tW: number, tH: number,
  tileIndex: number,
  hazard: boolean,
  t: number,
) {
  const r = Math.min(tW, tH) * 0.44;
  const zone = Math.min(4, Math.floor(tileIndex / 20));
  const typeIdx = tileIndex % 5;

  ctx.save();
  try {
    if (hazard) {
      const table = [FOREST_HAZARDS, OCEAN_HAZARDS, DESERT_HAZARDS, HUMAN_HAZARDS, RESTORE_HAZARDS][zone];
      table[typeIdx](ctx, cx, cy, r, t);
    } else {
      const table = [FOREST_BONUS, OCEAN_BONUS, DESERT_BONUS, HUMAN_BONUS, RESTORE_BONUS][zone];
      table[typeIdx](ctx, cx, cy, r, t);
    }
  } catch (_) {
    // silently swallow any drawing errors — don't crash the render loop
  }
  ctx.restore();
}
