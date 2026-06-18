import { useEffect, useRef } from "react";
import { drawAnimalPortrait } from "../lib/animal-draw";

interface AnimalPortraitProps {
  animalId: string;
  colorPrimary?: string;
  colorSecondary?: string;
  size: number;
  className?: string;
  highlighted?: boolean;
}

/**
 * Renders a single animal portrait on a canvas element.
 * Zero emojis — uses the full canvas 2D sprite drawing system.
 */
export function AnimalPortrait({
  animalId,
  colorPrimary,
  colorSecondary,
  size,
  className,
  highlighted = false,
}: AnimalPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 2;

    // Background circle
    const pc = colorPrimary ?? "#16a34a";
    ctx.save();
    if (highlighted) {
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = size * 0.25;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const bg = ctx.createRadialGradient(
      cx - r * 0.3, cy - r * 0.3, 0,
      cx, cy, r
    );
    bg.addColorStop(0, pc + "ff");
    bg.addColorStop(1, pc + "99");
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = highlighted ? "#fbbf24" : "rgba(255,255,255,0.5)";
    ctx.lineWidth = highlighted ? 2.5 : 1.5;
    ctx.stroke();
    ctx.restore();

    // Draw animal portrait clipped to circle
    drawAnimalPortrait(ctx, animalId, colorPrimary, colorSecondary, cx, cy, r * 0.96);
  }, [animalId, colorPrimary, colorSecondary, size, highlighted]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
