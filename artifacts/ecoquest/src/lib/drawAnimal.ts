import { Animal } from "@workspace/api-client-react";

export function drawAnimal(ctx: CanvasRenderingContext2D, animal: Animal | { name: string, colorPrimary?: string, colorSecondary?: string }, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  
  const primary = animal.colorPrimary || "#666";
  const secondary = animal.colorSecondary || "#333";
  
  const drawName = animal.name.toLowerCase();
  
  if (drawName.includes("rabbit") || drawName.includes("hare")) {
    // Rabbit
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2); // Body
    ctx.fill();
    
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.ellipse(-size * 0.15, -size * 0.5, size * 0.1, size * 0.3, 0, 0, Math.PI * 2); // Left Ear
    ctx.ellipse(size * 0.15, -size * 0.5, size * 0.1, size * 0.3, 0, 0, Math.PI * 2); // Right Ear
    ctx.fill();
    
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.1, size * 0.05, 0, Math.PI * 2); // Left Eye
    ctx.arc(size * 0.1, -size * 0.1, size * 0.05, 0, Math.PI * 2); // Right Eye
    ctx.fill();
  } else if (drawName.includes("turtle") || drawName.includes("tortoise")) {
    // Turtle
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.arc(-size * 0.3, size * 0.2, size * 0.1, 0, Math.PI * 2); // Leg 1
    ctx.arc(size * 0.3, size * 0.2, size * 0.1, 0, Math.PI * 2); // Leg 2
    ctx.fill();
    
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, Math.PI, 0); // Shell
    ctx.fill();
    
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.ellipse(size * 0.4, -size * 0.1, size * 0.15, size * 0.1, 0, 0, Math.PI * 2); // Head
    ctx.fill();
  } else if (drawName.includes("eagle") || drawName.includes("hawk")) {
    // Eagle
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.2); // Body bottom
    ctx.bezierCurveTo(-size * 0.8, -size * 0.2, -size * 0.8, -size * 0.4, 0, -size * 0.1); // Left wing
    ctx.bezierCurveTo(size * 0.8, -size * 0.4, size * 0.8, -size * 0.2, 0, size * 0.2); // Right wing
    ctx.fill();
    
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(size * 0.1, -size * 0.2); // Beak
    ctx.lineTo(size * 0.3, -size * 0.1);
    ctx.lineTo(size * 0.1, 0);
    ctx.fill();
  } else {
    // Generic simple body for others
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}
