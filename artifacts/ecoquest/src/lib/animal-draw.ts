/**
 * Animal portrait drawing system.
 * Pure Canvas 2D API — no emojis, no external assets.
 * Each character is a stylized 2D game portrait clipped within a circle.
 */

export type BodyPlan =
  | 'rabbit' | 'canine' | 'feline' | 'bear'
  | 'deer' | 'bird' | 'aquatic' | 'turtle'
  | 'snake' | 'primate' | 'elephant' | 'insect';

const PLAN_MAP: Record<string, BodyPlan> = {
  fox: 'canine', wolf: 'canine', raccoon: 'canine',
  desert_fox: 'canine', wild_dog: 'canine',
  bear: 'bear', hippo: 'bear',
  deer: 'deer', giraffe: 'deer', zebra: 'deer', camel: 'deer',
  rhino: 'deer', moose: 'deer',
  rabbit: 'rabbit', squirrel: 'rabbit', hedgehog: 'rabbit', meerkat: 'rabbit',
  owl: 'bird', eagle: 'bird', parrot: 'bird', flamingo: 'bird', pelican: 'bird',
  hummingbird: 'bird', albatross: 'bird', bat: 'bird', crow: 'bird',
  roadrunner: 'bird', cactus_wren: 'bird',
  dolphin: 'aquatic', shark: 'aquatic', whale: 'aquatic', seal: 'aquatic',
  seahorse: 'aquatic', jellyfish: 'aquatic', clownfish: 'aquatic',
  octopus: 'aquatic', crab: 'aquatic',
  sea_turtle: 'turtle', lizard: 'turtle',
  rattlesnake: 'snake',
  lion: 'feline', cheetah: 'feline', sand_cat: 'feline',
  gorilla: 'primate', chimpanzee: 'primate',
  elephant: 'elephant',
  butterfly: 'insect', dragonfly: 'insect', scorpion: 'insect', dung_beetle: 'insect',
};

export function getBodyPlan(animalId: string): BodyPlan {
  return PLAN_MAP[animalId] ?? 'canine';
}

// ── Color utilities ──────────────────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return [128, 128, 128];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function darken(hex: string, a: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgb(${Math.round(r*(1-a))},${Math.round(g*(1-a))},${Math.round(b*(1-a))})`;
}

function lighten(hex: string, a: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgb(${Math.min(255,Math.round(r+(255-r)*a))},${Math.min(255,Math.round(g+(255-g)*a))},${Math.min(255,Math.round(b+(255-b)*a))})`;
}

function safe(c: string | undefined): string {
  return (c?.startsWith('#') && c.length === 7) ? c : '#888888';
}

// ── Shared primitives ────────────────────────────────────────────────────────

function eye(ctx: CanvasRenderingContext2D, ex: number, ey: number, er: number) {
  ctx.fillStyle = '#0d0d1a';
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath(); ctx.arc(ex + er * 0.32, ey - er * 0.32, er * 0.4, 0, Math.PI * 2); ctx.fill();
}

function noseCircle(ctx: CanvasRenderingContext2D, nx: number, ny: number, nr: number, color = '#cc6688') {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2); ctx.fill();
}

// ── Main dispatch ────────────────────────────────────────────────────────────

export function drawAnimalPortrait(
  ctx: CanvasRenderingContext2D,
  animalId: string,
  primaryColor: string | undefined,
  secondaryColor: string | undefined,
  cx: number, cy: number, r: number
) {
  const plan = getBodyPlan(animalId);
  const pc = safe(primaryColor);
  const sc = safe(secondaryColor);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.97, 0, Math.PI * 2); ctx.clip();
  switch (plan) {
    case 'rabbit':   drawRabbit(ctx, cx, cy, r, pc, sc); break;
    case 'canine':   drawCanine(ctx, cx, cy, r, pc, sc, animalId); break;
    case 'feline':   drawFeline(ctx, cx, cy, r, pc, sc, animalId); break;
    case 'bear':     drawBear(ctx, cx, cy, r, pc, sc, animalId); break;
    case 'deer':     drawDeer(ctx, cx, cy, r, pc, sc, animalId); break;
    case 'bird':     drawBird(ctx, cx, cy, r, pc, sc, animalId); break;
    case 'aquatic':  drawAquatic(ctx, cx, cy, r, pc, sc, animalId); break;
    case 'turtle':   drawTurtleChar(ctx, cx, cy, r, pc, sc); break;
    case 'snake':    drawSnakeChar(ctx, cx, cy, r, pc, sc); break;
    case 'primate':  drawPrimate(ctx, cx, cy, r, pc, sc); break;
    case 'elephant': drawElephant(ctx, cx, cy, r, pc, sc); break;
    case 'insect':   drawInsect(ctx, cx, cy, r, pc, sc, animalId); break;
  }
  ctx.restore();
}

// ── Body plan implementations ────────────────────────────────────────────────

function drawRabbit(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;
  // Ears
  for (const [dx, rot] of [[-0.28, -0.08], [0.28, 0.08]] as [number,number][]) {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.35);
    ctx.beginPath(); ctx.ellipse(cx + dx*r, cy - r*0.6, r*0.18, r*0.38, rot, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lighten(sc, 0.2);
    ctx.beginPath(); ctx.ellipse(cx + dx*r, cy - r*0.6, r*0.09, r*0.22, rot, 0, Math.PI*2); ctx.fill();
  }
  // Head
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
  ctx.beginPath(); ctx.arc(cx, cy + r*0.08, r*0.52, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Cheeks
  ctx.fillStyle = lighten(pc, 0.28);
  for (const dx of [-0.28, 0.28]) {
    ctx.beginPath(); ctx.ellipse(cx + dx*r, cy + r*0.12, r*0.2, r*0.13, 0, 0, Math.PI*2); ctx.fill();
  }
  // Eyes, nose, mouth
  eye(ctx, cx - r*0.2, cy - r*0.02, r*0.1);
  eye(ctx, cx + r*0.2, cy - r*0.02, r*0.1);
  noseCircle(ctx, cx, cy + r*0.18, r*0.09, '#ff9eb5');
  ctx.strokeStyle = darken(pc, 0.4); ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r*0.26); ctx.quadraticCurveTo(cx - r*0.14, cy + r*0.35, cx - r*0.24, cy + r*0.3);
  ctx.moveTo(cx, cy + r*0.26); ctx.quadraticCurveTo(cx + r*0.14, cy + r*0.35, cx + r*0.24, cy + r*0.3);
  ctx.stroke();
}

function drawCanine(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string, id: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;
  const isFox = id === 'fox' || id === 'desert_fox';
  const isRaccoon = id === 'raccoon';
  // Pointed ears
  for (const [dx, sx] of [[-0.35, -1], [0.35, 1]] as [number,number][]) {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.35);
    ctx.beginPath();
    ctx.moveTo(cx + dx*r - r*0.22, cy - r*0.42); ctx.lineTo(cx + dx*r, cy - r*0.75); ctx.lineTo(cx + dx*r + r*0.22, cy - r*0.42);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isFox ? '#ff9eb5' : lighten(pc, 0.3);
    ctx.beginPath();
    ctx.moveTo(cx + dx*r - r*0.12, cy - r*0.46); ctx.lineTo(cx + dx*r, cy - r*0.62); ctx.lineTo(cx + dx*r + r*0.12, cy - r*0.46);
    ctx.closePath(); ctx.fill();
    void sx;
  }
  // Head
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
  ctx.beginPath(); ctx.arc(cx, cy - r*0.05, r*0.52, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Face markings
  if (isFox) {
    ctx.fillStyle = lighten(sc, 0.3);
    ctx.beginPath(); ctx.ellipse(cx, cy + r*0.1, r*0.28, r*0.22, 0, 0, Math.PI*2); ctx.fill();
  }
  if (isRaccoon) {
    ctx.fillStyle = 'rgba(20,20,20,0.65)';
    ctx.beginPath(); ctx.ellipse(cx - r*0.22, cy - r*0.12, r*0.18, r*0.11, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r*0.22, cy - r*0.12, r*0.18, r*0.11, 0.3, 0, Math.PI*2); ctx.fill();
  }
  // Snout
  ctx.fillStyle = lighten(pc, 0.15); ctx.strokeStyle = darken(pc, 0.2);
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.2, r*0.28, r*0.18, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  eye(ctx, cx - r*0.2, cy - r*0.1, r*0.1);
  eye(ctx, cx + r*0.2, cy - r*0.1, r*0.1);
  noseCircle(ctx, cx, cy + r*0.14, r*0.1, '#1a1a2e');
}

function drawFeline(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string, id: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;
  const isLion = id === 'lion';
  // Mane
  if (isLion) {
    for (let a = 0; a < Math.PI*2; a += Math.PI/6) {
      ctx.fillStyle = darken(pc, 0.22);
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a)*r*0.62, cy + Math.sin(a)*r*0.62, r*0.22, r*0.15, a, 0, Math.PI*2); ctx.fill();
    }
  }
  // Round ears
  for (const dx of [-0.4, 0.4]) {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.35);
    ctx.beginPath(); ctx.arc(cx + dx*r, cy - r*0.52, r*0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9eb5';
    ctx.beginPath(); ctx.arc(cx + dx*r, cy - r*0.52, r*0.1, 0, Math.PI*2); ctx.fill();
  }
  // Head (wide)
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
  ctx.beginPath(); ctx.ellipse(cx, cy - r*0.02, r*0.56, r*0.52, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Spots for cheetah
  if (id === 'cheetah') {
    ctx.fillStyle = darken(pc, 0.45);
    for (const [dx, dy] of [[-0.2,-0.15],[0.2,-0.15],[-0.1,0.12],[0.1,0.12],[0,-0.32]]) {
      ctx.beginPath(); ctx.arc(cx + dx*r, cy + dy*r, r*0.06, 0, Math.PI*2); ctx.fill();
    }
  }
  // Muzzle
  ctx.fillStyle = lighten(pc, 0.2);
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.22, r*0.32, r*0.2, 0, 0, Math.PI*2); ctx.fill();
  // Whisker dots
  ctx.fillStyle = darken(pc, 0.3);
  for (const [dx, dy] of [[-0.12,0.18],[-0.26,0.22],[0.12,0.18],[0.26,0.22]]) {
    ctx.beginPath(); ctx.arc(cx + dx*r, cy + dy*r, r*0.03, 0, Math.PI*2); ctx.fill();
  }
  eye(ctx, cx - r*0.22, cy - r*0.08, r*0.11);
  eye(ctx, cx + r*0.22, cy - r*0.08, r*0.11);
  noseCircle(ctx, cx, cy + r*0.14, r*0.08, '#e879a0');
  void sc;
}

function drawBear(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string, id: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;
  const isHippo = id === 'hippo';
  for (const dx of [-0.42, 0.42]) {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
    ctx.beginPath(); ctx.arc(cx + dx*r, cy - r*0.5, r*0.18, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lighten(pc, 0.2);
    ctx.beginPath(); ctx.arc(cx + dx*r, cy - r*0.5, r*0.09, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
  ctx.beginPath(); ctx.ellipse(cx, cy - r*0.02, r*0.58, r*0.54, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = lighten(pc, isHippo ? 0.35 : 0.15); ctx.strokeStyle = darken(pc, 0.2);
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.22, r*0.38, r*0.25, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  if (isHippo) {
    ctx.fillStyle = darken(pc, 0.3);
    for (const dx of [-0.1, 0.1]) { ctx.beginPath(); ctx.ellipse(cx + dx*r, cy + r*0.2, r*0.06, r*0.04, 0, 0, Math.PI*2); ctx.fill(); }
  }
  eye(ctx, cx - r*0.22, cy - r*0.12, r*0.1);
  eye(ctx, cx + r*0.22, cy - r*0.12, r*0.1);
  if (!isHippo) noseCircle(ctx, cx, cy + r*0.15, r*0.1, '#1a1a2e');
  void sc;
}

function drawDeer(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string, id: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;
  const isGiraffe = id === 'giraffe', isZebra = id === 'zebra', isRhino = id === 'rhino';
  // Antlers (except special cases)
  if (!isGiraffe && !isZebra && !isRhino && id !== 'camel' && id !== 'hippo') {
    ctx.strokeStyle = darken(pc, 0.4); ctx.lineWidth = lw*1.2;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx*r*0.25, cy - r*0.45); ctx.lineTo(cx + sx*r*0.42, cy - r*0.78); ctx.lineTo(cx + sx*r*0.3, cy - r*0.9);
      ctx.moveTo(cx + sx*r*0.42, cy - r*0.78); ctx.lineTo(cx + sx*r*0.58, cy - r*0.72);
      ctx.stroke();
    }
    ctx.lineWidth = lw;
  }
  if (isRhino) {
    ctx.fillStyle = lighten(sc, 0.1);
    ctx.beginPath(); ctx.moveTo(cx, cy - r*0.42); ctx.lineTo(cx - r*0.12, cy - r*0.22); ctx.lineTo(cx + r*0.12, cy - r*0.22); ctx.closePath(); ctx.fill();
  }
  if (isGiraffe) {
    ctx.fillStyle = darken(pc, 0.3);
    for (const dx of [-0.2, 0.2]) { ctx.beginPath(); ctx.ellipse(cx + dx*r, cy - r*0.75, r*0.06, r*0.18, 0, 0, Math.PI*2); ctx.fill(); }
  }
  // Ears
  for (const [dx, rot] of [[-0.4, -0.4], [0.4, 0.4]] as [number,number][]) {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
    ctx.beginPath(); ctx.ellipse(cx + dx*r, cy - r*0.45, r*0.16, r*0.25, rot, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  }
  // Head
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
  ctx.beginPath(); ctx.ellipse(cx, cy - r*0.02, r*0.5, r*0.54, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Giraffe patches
  if (isGiraffe) {
    ctx.fillStyle = darken(pc, 0.4);
    for (const [dx, dy] of [[-0.18,-0.15],[0.2,0.1],[0,-0.38],[-0.05,0.28]]) {
      ctx.beginPath(); ctx.ellipse(cx + dx*r, cy + dy*r, r*0.1, r*0.08, 0.5, 0, Math.PI*2); ctx.fill();
    }
  }
  // Zebra stripes
  if (isZebra) {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = lw*1.3;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i*r*0.2, cy - r*0.55); ctx.lineTo(cx + i*r*0.2 - r*0.14, cy + r*0.52); ctx.stroke(); }
    ctx.lineWidth = lw;
  }
  // Snout
  ctx.fillStyle = lighten(pc, 0.15);
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.3, r*0.26, r*0.2, 0, 0, Math.PI*2); ctx.fill();
  if (id === 'camel') {
    ctx.fillStyle = darken(pc, 0.2);
    ctx.beginPath(); ctx.ellipse(cx, cy - r*0.62, r*0.22, r*0.16, 0, 0, Math.PI*2); ctx.fill();
  }
  eye(ctx, cx - r*0.2, cy - r*0.1, r*0.11);
  eye(ctx, cx + r*0.2, cy - r*0.1, r*0.11);
  noseCircle(ctx, cx, cy + r*0.25, r*0.09, '#cc6688');
}

function drawBird(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string, id: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;
  const isOwl = id === 'owl', isFlamingo = id === 'flamingo', isBat = id === 'bat';
  // Wings
  for (const [sx, tilt] of [[-1, 0.4], [1, -0.4]] as [number,number][]) {
    ctx.fillStyle = isBat ? darken(pc, 0.12) : lighten(pc, sx < 0 ? 0 : 0.1);
    ctx.strokeStyle = darken(pc, 0.35);
    ctx.beginPath(); ctx.ellipse(cx + sx*r*0.52, cy + r*0.15, r*0.3, isBat ? r*0.45 : r*0.2, tilt, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  }
  // Head
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
  ctx.beginPath(); ctx.arc(cx, cy - r*(isOwl ? 0.08 : 0.1), r*(isOwl ? 0.52 : 0.46), 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Owl tufts
  if (isOwl) {
    for (const dx of [-0.22, 0.22]) {
      ctx.fillStyle = pc;
      ctx.beginPath(); ctx.moveTo(cx + dx*r - r*0.08, cy - r*0.46); ctx.lineTo(cx + dx*r, cy - r*0.65); ctx.lineTo(cx + dx*r + r*0.08, cy - r*0.46); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = lighten(sc, 0.2);
    ctx.beginPath(); ctx.ellipse(cx, cy - r*0.05, r*0.4, r*0.4, 0, 0, Math.PI*2); ctx.fill();
  }
  if (isFlamingo) {
    ctx.fillStyle = lighten(pc, 0.3);
    ctx.beginPath(); ctx.arc(cx, cy - r*0.1, r*0.38, 0, Math.PI*2); ctx.fill();
  }
  // Beak
  ctx.fillStyle = isFlamingo ? '#D97706' : '#F59E0B';
  ctx.strokeStyle = darken('#F59E0B', 0.35);
  ctx.beginPath();
  if (isOwl) {
    ctx.moveTo(cx - r*0.08, cy + r*0.14); ctx.lineTo(cx, cy + r*0.35); ctx.lineTo(cx + r*0.08, cy + r*0.14);
  } else if (isFlamingo) {
    ctx.moveTo(cx, cy + r*0.1); ctx.lineTo(cx + r*0.35, cy + r*0.22); ctx.lineTo(cx + r*0.35, cy + r*0.38); ctx.lineTo(cx, cy + r*0.28);
  } else {
    ctx.moveTo(cx, cy + r*0.05); ctx.lineTo(cx + r*0.45, cy); ctx.lineTo(cx, cy + r*0.18);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const er = isOwl || isBat ? r*0.14 : r*0.1;
  eye(ctx, cx - r*0.18, cy - r*0.14, er);
  eye(ctx, cx + r*0.18, cy - r*0.14, er);
}

function drawAquatic(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string, id: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;

  if (id === 'jellyfish') {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
    ctx.beginPath(); ctx.ellipse(cx, cy - r*0.15, r*0.52, r*0.38, 0, Math.PI, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `${pc}88`;
    ctx.beginPath(); ctx.ellipse(cx, cy, r*0.45, r*0.25, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = lighten(pc, 0.22); ctx.lineWidth = lw*0.8;
    for (const dx of [-0.35,-0.12,0.12,0.35]) {
      ctx.beginPath(); ctx.moveTo(cx + dx*r, cy + r*0.2); ctx.quadraticCurveTo(cx + (dx+0.08)*r, cy + r*0.5, cx + dx*r, cy + r*0.72); ctx.stroke();
    }
    ctx.lineWidth = lw;
    eye(ctx, cx - r*0.15, cy - r*0.12, r*0.07); eye(ctx, cx + r*0.15, cy - r*0.12, r*0.07); return;
  }

  if (id === 'octopus') {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
    ctx.beginPath(); ctx.ellipse(cx, cy - r*0.2, r*0.45, r*0.38, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = lw*1.4;
    for (let i = 0; i < 5; i++) {
      const dx = -0.4 + i*0.2, flip = i%2 ? 0.15 : -0.15;
      ctx.strokeStyle = darken(pc, 0.18); ctx.beginPath();
      ctx.moveTo(cx + dx*r, cy + r*0.12); ctx.quadraticCurveTo(cx + (dx+flip)*r, cy + r*0.45, cx + (dx+flip*1.3)*r, cy + r*0.72); ctx.stroke();
    }
    ctx.lineWidth = lw;
    eye(ctx, cx - r*0.18, cy - r*0.22, r*0.09); eye(ctx, cx + r*0.18, cy - r*0.22, r*0.09); return;
  }

  if (id === 'crab') {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
    ctx.beginPath(); ctx.ellipse(cx, cy, r*0.5, r*0.38, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + sx*r*0.68, cy - r*0.08, r*0.22, r*0.14, sx*0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = darken(pc, 0.25); ctx.lineWidth = lw*0.8;
    for (const dx of [-0.5,-0.25,0.25,0.5]) { ctx.beginPath(); ctx.moveTo(cx + dx*r, cy + r*0.3); ctx.lineTo(cx + dx*r*1.5, cy + r*0.72); ctx.stroke(); }
    ctx.lineWidth = lw;
    eye(ctx, cx - r*0.18, cy - r*0.12, r*0.09); eye(ctx, cx + r*0.18, cy - r*0.12, r*0.09); return;
  }

  // Fish / dolphin / shark / whale / seal — streamlined horizontal body
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
  ctx.beginPath(); ctx.ellipse(cx, cy, r*0.58, r*0.38, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = lighten(sc, 0.15);
  ctx.beginPath(); ctx.ellipse(cx + r*0.05, cy + r*0.08, r*0.35, r*0.22, 0, 0, Math.PI*2); ctx.fill();
  // Dorsal fin
  ctx.fillStyle = id === 'shark' ? darken(pc, 0.2) : pc; ctx.strokeStyle = darken(pc, 0.35);
  ctx.beginPath(); ctx.moveTo(cx - r*0.08, cy - r*0.35); ctx.lineTo(cx + r*0.18, cy - r*0.62); ctx.lineTo(cx + r*0.32, cy - r*0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Tail
  ctx.fillStyle = darken(pc, 0.15);
  ctx.beginPath(); ctx.moveTo(cx + r*0.52, cy); ctx.lineTo(cx + r*0.78, cy - r*0.28); ctx.lineTo(cx + r*0.72, cy); ctx.lineTo(cx + r*0.78, cy + r*0.28); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Shark teeth
  if (id === 'shark') {
    ctx.fillStyle = 'white'; ctx.strokeStyle = darken('#ffffff', 0.1); ctx.lineWidth = lw*0.5;
    for (let i = 0; i < 4; i++) {
      const tx = cx - r*0.28 + i*r*0.12;
      ctx.beginPath(); ctx.moveTo(tx, cy + r*0.3); ctx.lineTo(tx + r*0.05, cy + r*0.48); ctx.lineTo(tx + r*0.1, cy + r*0.3); ctx.fill(); ctx.stroke();
    }
    ctx.lineWidth = lw;
  }
  // Dolphin smile
  if (id === 'dolphin') {
    ctx.strokeStyle = darken(pc, 0.35); ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx - r*0.35, cy + r*0.22, r*0.22, 0, Math.PI*0.8); ctx.stroke();
  }
  // Snout line
  ctx.strokeStyle = darken(pc, 0.3); ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(cx - r*0.52, cy - r*0.05); ctx.lineTo(cx - r*0.78, cy); ctx.stroke();
  eye(ctx, cx - r*0.3, cy - r*0.1, r*0.09);
}

function drawTurtleChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;
  // Shell
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.35);
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.05, r*0.6, r*0.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Shell pattern
  ctx.strokeStyle = darken(pc, 0.45); ctx.lineWidth = lw*0.55;
  ctx.beginPath(); ctx.arc(cx, cy + r*0.05, r*0.22, 0, Math.PI*2); ctx.stroke();
  for (let a = 0; a < 6; a++) {
    const angle = a*Math.PI/3;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle)*r*0.22, cy + r*0.05 + Math.sin(angle)*r*0.22); ctx.lineTo(cx + Math.cos(angle)*r*0.55, cy + r*0.05 + Math.sin(angle)*r*0.44); ctx.stroke();
  }
  ctx.lineWidth = lw;
  // Head
  ctx.fillStyle = lighten(sc, 0.05); ctx.strokeStyle = darken(sc, 0.3);
  ctx.beginPath(); ctx.ellipse(cx, cy - r*0.44, r*0.22, r*0.2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Flippers
  for (const dx of [-0.52, 0.52]) {
    ctx.fillStyle = lighten(sc, 0.05);
    ctx.beginPath(); ctx.ellipse(cx + dx*r, cy - r*0.05, r*0.2, r*0.1, dx*0.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  }
  eye(ctx, cx - r*0.08, cy - r*0.46, r*0.07); eye(ctx, cx + r*0.08, cy - r*0.46, r*0.07);
}

function drawSnakeChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string) {
  const lw = Math.max(0.5, r * 0.06);
  // Coiled body
  ctx.strokeStyle = pc; ctx.lineWidth = r*0.16; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r*0.35, cy + r*0.7);
  ctx.bezierCurveTo(cx + r*0.65, cy + r*0.5, cx - r*0.65, cy, cx + r*0.45, cy - r*0.2);
  ctx.bezierCurveTo(cx + r*0.75, cy - r*0.35, cx + r*0.5, cy - r*0.7, cx + r*0.1, cy - r*0.72);
  ctx.stroke();
  // Scale highlight
  ctx.strokeStyle = lighten(pc, 0.28); ctx.lineWidth = r*0.05;
  ctx.beginPath();
  ctx.moveTo(cx - r*0.3, cy + r*0.65);
  ctx.bezierCurveTo(cx + r*0.6, cy + r*0.45, cx - r*0.6, cy - r*0.05, cx + r*0.4, cy - r*0.25);
  ctx.stroke();
  ctx.lineWidth = lw; ctx.lineCap = 'butt';
  // Head
  ctx.fillStyle = darken(pc, 0.1); ctx.strokeStyle = darken(pc, 0.4);
  ctx.beginPath(); ctx.ellipse(cx + r*0.06, cy - r*0.72, r*0.2, r*0.14, 0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Tongue
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = lw*0.5;
  ctx.beginPath(); ctx.moveTo(cx + r*0.24, cy - r*0.72); ctx.lineTo(cx + r*0.42, cy - r*0.72);
  ctx.moveTo(cx + r*0.42, cy - r*0.72); ctx.lineTo(cx + r*0.52, cy - r*0.62);
  ctx.moveTo(cx + r*0.42, cy - r*0.72); ctx.lineTo(cx + r*0.52, cy - r*0.82);
  ctx.stroke(); ctx.lineWidth = lw;
  eye(ctx, cx + r*0.04, cy - r*0.78, r*0.07);
  void sc;
}

function drawPrimate(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;
  // Arms
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
  for (const dx of [-0.55, 0.55]) {
    ctx.beginPath(); ctx.ellipse(cx + dx*r, cy + r*0.2, r*0.22, r*0.14, dx*0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  }
  // Head
  ctx.beginPath(); ctx.ellipse(cx, cy - r*0.12, r*0.56, r*0.52, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Brow ridge
  ctx.fillStyle = darken(pc, 0.2);
  ctx.beginPath(); ctx.ellipse(cx, cy - r*0.32, r*0.5, r*0.14, 0, 0, Math.PI*2); ctx.fill();
  // Face
  ctx.fillStyle = lighten(sc, 0.1); ctx.strokeStyle = darken(sc, 0.2);
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.05, r*0.35, r*0.38, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Nose
  ctx.fillStyle = darken(sc, 0.2);
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.1, r*0.14, r*0.1, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = darken(sc, 0.5);
  for (const dx of [-0.08, 0.08]) { ctx.beginPath(); ctx.arc(cx + dx*r, cy + r*0.1, r*0.04, 0, Math.PI*2); ctx.fill(); }
  eye(ctx, cx - r*0.2, cy - r*0.08, r*0.1); eye(ctx, cx + r*0.2, cy - r*0.08, r*0.1);
}

function drawElephant(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;
  // Fan ears
  for (const sx of [-1, 1]) {
    ctx.fillStyle = lighten(pc, 0.08); ctx.strokeStyle = darken(pc, 0.3);
    ctx.beginPath(); ctx.ellipse(cx + sx*r*0.65, cy - r*0.08, r*0.3, r*0.44, sx*0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lighten('#EC4899', 0.25);
    ctx.beginPath(); ctx.ellipse(cx + sx*r*0.65, cy - r*0.08, r*0.18, r*0.28, sx*0.3, 0, Math.PI*2); ctx.fill();
  }
  // Head
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.3);
  ctx.beginPath(); ctx.arc(cx, cy - r*0.1, r*0.52, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Trunk (curling)
  ctx.strokeStyle = pc; ctx.lineWidth = r*0.18; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy + r*0.25); ctx.bezierCurveTo(cx + r*0.05, cy + r*0.55, cx + r*0.35, cy + r*0.62, cx + r*0.45, cy + r*0.45); ctx.stroke();
  ctx.lineWidth = lw; ctx.lineCap = 'butt';
  // Tusks
  ctx.strokeStyle = lighten(sc, 0.25); ctx.lineWidth = lw*1.2;
  for (const dx of [-0.15, 0.15]) {
    ctx.beginPath(); ctx.moveTo(cx + dx*r, cy + r*0.28); ctx.quadraticCurveTo(cx + dx*r*2.5, cy + r*0.55, cx + dx*r*2.8, cy + r*0.35); ctx.stroke();
  }
  ctx.lineWidth = lw;
  eye(ctx, cx - r*0.22, cy - r*0.18, r*0.1); eye(ctx, cx + r*0.22, cy - r*0.18, r*0.1);
  void sc;
}

function drawInsect(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pc: string, sc: string, id: string) {
  const lw = Math.max(0.5, r * 0.06);
  ctx.lineWidth = lw;

  if (id === 'butterfly') {
    // 4 wings
    const wings: [number,number,number,number][] = [[-0.45,-0.35,0.4,0.32],[0.45,-0.35,0.4,0.32],[-0.35,0.2,0.3,0.2],[0.35,0.2,0.3,0.2]];
    wings.forEach(([dx,dy,rx,ry], i) => {
      ctx.fillStyle = i % 2 === 0 ? pc : lighten(pc, 0.15); ctx.strokeStyle = darken(pc, 0.35);
      ctx.beginPath(); ctx.ellipse(cx + dx*r, cy + dy*r, rx*r, ry*r, dx < 0 ? 0.3 : -0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = `${sc}88`;
      ctx.beginPath(); ctx.ellipse(cx + dx*r, cy + dy*r, rx*r*0.5, ry*r*0.5, dx < 0 ? 0.3 : -0.3, 0, Math.PI*2); ctx.fill();
    });
    ctx.fillStyle = darken(pc, 0.3); ctx.strokeStyle = darken(pc, 0.45);
    ctx.beginPath(); ctx.ellipse(cx, cy, r*0.1, r*0.55, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = darken(pc, 0.4); ctx.lineWidth = lw*0.7;
    for (const [dx, ddir] of [[-0.12,-1],[0.12,-1]] as [number,number][]) {
      ctx.beginPath(); ctx.moveTo(cx, cy - r*0.52); ctx.quadraticCurveTo(cx + dx*r, cy + ddir*r*0.5, cx + dx*r*1.5, cy + ddir*r*0.85); ctx.stroke();
      ctx.fillStyle = darken(pc, 0.2); ctx.beginPath(); ctx.arc(cx + dx*r*1.5, cy - r*0.85, r*0.06, 0, Math.PI*2); ctx.fill();
    }
    ctx.lineWidth = lw;
    eye(ctx, cx - r*0.06, cy - r*0.45, r*0.07); eye(ctx, cx + r*0.06, cy - r*0.45, r*0.07); return;
  }

  if (id === 'scorpion') {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.35);
    for (const [sy, ew] of [[cy - r*0.1, 0.35],[cy + r*0.15, 0.3],[cy + r*0.38, 0.25]] as [number,number][]) {
      ctx.beginPath(); ctx.ellipse(cx, sy, ew*r, r*0.14, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + sx*r*0.52, cy - r*0.22, r*0.2, r*0.1, sx*0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = darken(pc, 0.2); ctx.lineWidth = r*0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy + r*0.5); ctx.bezierCurveTo(cx + r*0.5, cy + r*0.7, cx + r*0.72, cy + r*0.3, cx + r*0.65, cy - r*0.1); ctx.stroke();
    ctx.lineWidth = lw; ctx.lineCap = 'butt';
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx + r*0.65, cy - r*0.18, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = darken(pc, 0.25); ctx.lineWidth = lw*0.6;
    for (const dx of [-0.35,-0.15,0.15,0.35]) {
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sx*r*0.28, cy + dx*r); ctx.lineTo(cx + sx*r*0.62, cy + dx*r*0.7); ctx.stroke(); }
    }
    ctx.lineWidth = lw;
    eye(ctx, cx - r*0.12, cy - r*0.18, r*0.07); eye(ctx, cx + r*0.12, cy - r*0.18, r*0.07); return;
  }

  if (id === 'dragonfly') {
    ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.35);
    ctx.beginPath(); ctx.ellipse(cx, cy, r*0.1, r*0.7, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    const dw: [number,number,number,number][] = [[-0.5,-0.25,0.4,0.15],[0.5,-0.25,0.4,0.15],[-0.4,0.15,0.3,0.12],[0.4,0.15,0.3,0.12]];
    dw.forEach(([dx,dy,rx,ry]) => {
      ctx.fillStyle = `${sc}66`; ctx.strokeStyle = darken(sc, 0.2); ctx.lineWidth = lw*0.5;
      ctx.beginPath(); ctx.ellipse(cx + dx*r, cy + dy*r, rx*r, ry*r, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    });
    ctx.lineWidth = lw; ctx.fillStyle = darken(pc, 0.1); ctx.strokeStyle = darken(pc, 0.4);
    ctx.beginPath(); ctx.arc(cx, cy - r*0.65, r*0.18, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    eye(ctx, cx - r*0.1, cy - r*0.67, r*0.08); eye(ctx, cx + r*0.1, cy - r*0.67, r*0.08); return;
  }

  // Default: beetle
  ctx.fillStyle = pc; ctx.strokeStyle = darken(pc, 0.35);
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.1, r*0.42, r*0.52, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = darken(pc, 0.45); ctx.lineWidth = lw*0.6;
  ctx.beginPath(); ctx.moveTo(cx, cy - r*0.38); ctx.lineTo(cx, cy + r*0.62); ctx.stroke();
  ctx.lineWidth = lw;
  ctx.fillStyle = darken(pc, 0.15); ctx.strokeStyle = darken(pc, 0.4);
  ctx.beginPath(); ctx.arc(cx, cy - r*0.42, r*0.22, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = darken(pc, 0.3); ctx.lineWidth = lw*0.6;
  ctx.beginPath(); ctx.moveTo(cx - r*0.08, cy - r*0.6); ctx.lineTo(cx - r*0.3, cy - r*0.88);
  ctx.moveTo(cx + r*0.08, cy - r*0.6); ctx.lineTo(cx + r*0.3, cy - r*0.88); ctx.stroke();
  for (const dy of [-0.2, 0, 0.22]) {
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sx*r*0.38, cy + dy*r); ctx.lineTo(cx + sx*r*0.72, cy + dy*r*0.6 + r*0.15); ctx.stroke(); }
  }
  ctx.lineWidth = lw;
  eye(ctx, cx - r*0.1, cy - r*0.44, r*0.07); eye(ctx, cx + r*0.1, cy - r*0.44, r*0.07);
  void sc;
}

// ── Tile decoration & special icons ─────────────────────────────────────────

/** Draw a lightning bolt (hazard tile icon) */
export function drawLightningBolt(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color = '#fca5a5') {
  ctx.fillStyle = color; ctx.strokeStyle = darken(color, 0.3); ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx + size*0.12, cy - size*0.45); ctx.lineTo(cx - size*0.12, cy - size*0.02); ctx.lineTo(cx + size*0.05, cy - size*0.02);
  ctx.lineTo(cx - size*0.12, cy + size*0.45); ctx.lineTo(cx + size*0.18, cy + size*0.08); ctx.lineTo(cx + size*0.02, cy + size*0.08);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

/** Draw a 5-pointed star (bonus tile icon) */
export function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color = '#fde68a') {
  ctx.fillStyle = color; ctx.strokeStyle = darken(color, 0.3); ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI / 5) - Math.PI / 2;
    const rr = i % 2 === 0 ? size * 0.42 : size * 0.18;
    if (i === 0) ctx.moveTo(cx + Math.cos(angle)*rr, cy + Math.sin(angle)*rr);
    else ctx.lineTo(cx + Math.cos(angle)*rr, cy + Math.sin(angle)*rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

/** Draw a checkered finish flag */
export function drawFinishFlag(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = size * 0.06;
  ctx.beginPath(); ctx.moveTo(cx - size*0.15, cy + size*0.45); ctx.lineTo(cx - size*0.15, cy - size*0.45); ctx.stroke();
  const cols = 4, rows = 3, fw = size*0.55/cols, fh = size*0.35/rows;
  const fx0 = cx - size*0.15, fy0 = cy - size*0.45;
  for (let rr = 0; rr < rows; rr++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (rr + c) % 2 === 0 ? 'white' : '#1a1a2e';
      ctx.fillRect(fx0 + c*fw, fy0 + rr*fh, fw, fh);
    }
  }
  ctx.strokeStyle = '#555'; ctx.lineWidth = size*0.04;
  ctx.strokeRect(fx0, fy0, size*0.55, size*0.35);
}

/** Draw zone environment art in a tile corner */
export function drawZoneDecoration(
  ctx: CanvasRenderingContext2D,
  zoneName: string,
  x0: number, y0: number,
  tileW: number, tileH: number
) {
  const s = Math.min(tileW, tileH) * 0.26;
  const dx = x0 + tileW * 0.78;
  const dy = y0 + tileH * 0.74;
  ctx.save(); ctx.globalAlpha = 0.3;

  switch (zoneName) {
    case 'forest': {
      // Tree
      ctx.fillStyle = '#92400E';
      ctx.fillRect(dx - s*0.08, dy - s*0.2, s*0.16, s*0.38);
      ctx.fillStyle = '#15803D';
      ctx.beginPath(); ctx.arc(dx, dy - s*0.38, s*0.3, 0, Math.PI*2); ctx.fill();
      break;
    }
    case 'ocean': {
      // Waves
      ctx.strokeStyle = '#60A5FA'; ctx.lineWidth = s*0.1; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(dx - s*0.4, dy); ctx.quadraticCurveTo(dx - s*0.1, dy - s*0.26, dx, dy); ctx.quadraticCurveTo(dx + s*0.1, dy + s*0.26, dx + s*0.4, dy); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dx - s*0.4, dy - s*0.24); ctx.quadraticCurveTo(dx - s*0.1, dy - s*0.5, dx, dy - s*0.24); ctx.quadraticCurveTo(dx + s*0.1, dy + s*0.02, dx + s*0.4, dy - s*0.24); ctx.stroke();
      ctx.lineCap = 'butt';
      break;
    }
    case 'desert': {
      // Cactus
      ctx.fillStyle = '#16A34A';
      ctx.fillRect(dx - s*0.08, dy - s*0.48, s*0.16, s*0.52);
      ctx.fillRect(dx - s*0.3, dy - s*0.22, s*0.22, s*0.08);
      ctx.fillRect(dx + s*0.08, dy - s*0.3, s*0.22, s*0.08);
      ctx.fillRect(dx - s*0.3, dy - s*0.22, s*0.08, s*0.16);
      ctx.fillRect(dx + s*0.28, dy - s*0.3, s*0.08, s*0.16);
      break;
    }
    case 'human_impact': {
      // Factory building
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(dx - s*0.22, dy - s*0.42, s*0.44, s*0.48);
      ctx.fillStyle = '#FDE68A';
      for (const [wx, wy] of [[-0.12,-0.3],[0.04,-0.3],[-0.12,-0.1],[0.04,-0.1]]) {
        ctx.fillRect(dx + wx*s, dy + wy*s, s*0.1, s*0.1);
      }
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(dx + s*0.1, dy - s*0.65, s*0.1, s*0.26);
      ctx.fillStyle = '#9CA3AF';
      for (let i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.arc(dx + s*0.15 + i*s*0.06, dy - s*0.68 - i*s*0.12, s*(0.1 + i*0.04), 0, Math.PI*2); ctx.fill();
      }
      break;
    }
    case 'restoration': {
      // Flower
      ctx.fillStyle = '#FDE68A';
      for (let p = 0; p < 6; p++) {
        const a = (p/6)*Math.PI*2;
        ctx.beginPath(); ctx.ellipse(dx + Math.cos(a)*s*0.22, dy - s*0.1 + Math.sin(a)*s*0.22, s*0.12, s*0.08, a, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#15803D';
      ctx.beginPath(); ctx.arc(dx, dy - s*0.1, s*0.13, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#15803D'; ctx.lineWidth = s*0.08;
      ctx.beginPath(); ctx.moveTo(dx, dy + s*0.06); ctx.lineTo(dx, dy + s*0.44); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
