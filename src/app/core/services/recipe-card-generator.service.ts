import { Injectable } from '@angular/core';
import { Recipe } from '../models/recipe.model';

// Canvas dimensions: Instagram-friendly 4:5 ratio
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const PHOTO_SECTION_HEIGHT = CARD_HEIGHT * 0.6;  // top 60%
const INFO_SECTION_Y = PHOTO_SECTION_HEIGHT;       // bottom 40%
const INFO_SECTION_HEIGHT = CARD_HEIGHT - PHOTO_SECTION_HEIGHT;

@Injectable({ providedIn: 'root' })
export class RecipeCardGeneratorService {

  async generateCard(recipe: Recipe): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Draw cover photo or placeholder
    if (recipe.photoURLs?.length) {
      try {
        const img = await this._loadImage(recipe.photoURLs[0]);
        // Cover-fit: crop to fill top 60%
        const scale = Math.max(CARD_WIDTH / img.width, PHOTO_SECTION_HEIGHT / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (CARD_WIDTH - drawW) / 2;
        const offsetY = (PHOTO_SECTION_HEIGHT - drawH) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      } catch {
        this._drawPhotoPlaceholder(ctx);
      }
    } else {
      this._drawPhotoPlaceholder(ctx);
    }

    // Gradient overlay on bottom 40% info section
    const gradient = ctx.createLinearGradient(0, INFO_SECTION_Y, 0, CARD_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, INFO_SECTION_Y, CARD_WIDTH, INFO_SECTION_HEIGHT);

    // Thin accent line at transition
    ctx.fillStyle = '#e63946';
    ctx.fillRect(0, INFO_SECTION_Y, CARD_WIDTH, 4);

    const padding = 60;
    let y = INFO_SECTION_Y + 70;

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    const titleLines = this._wrapText(ctx, recipe.title, CARD_WIDTH - padding * 2);
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, padding, y);
      y += 78;
    }
    y += 20;

    // Cuisine + difficulty chips
    const chipY = y;
    this._drawChip(ctx, recipe.cuisineType, padding, chipY, '#e63946');
    const cuisineWidth = ctx.measureText(recipe.cuisineType).width + 50;
    const diffColor = { easy: '#2d6a4f', medium: '#e9c46a', hard: '#e63946' }[recipe.difficulty] ?? '#888';
    this._drawChip(ctx, recipe.difficulty, padding + cuisineWidth + 20, chipY, diffColor);
    y += 80;

    // Timing row
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '40px system-ui, -apple-system, sans-serif';
    const timingParts: string[] = [];
    if (recipe.prepTime) timingParts.push(`Prep ${recipe.prepTime}m`);
    if (recipe.cookTime) timingParts.push(`Cook ${recipe.cookTime}m`);
    timingParts.push(`${recipe.baseServings} servings`);
    ctx.fillText(timingParts.join('  •  '), padding, y);
    y += 60;

    // Watermark at bottom
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '36px system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText('RecipeShare', padding, CARD_HEIGHT - 40);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      }, 'image/png');
    });
  }

  private _loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private _drawPhotoPlaceholder(ctx: CanvasRenderingContext2D): void {
    // Subtle gradient placeholder
    const grad = ctx.createLinearGradient(0, 0, 0, PHOTO_SECTION_HEIGHT);
    grad.addColorStop(0, '#2d3561');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_WIDTH, PHOTO_SECTION_HEIGHT);

    // Centered icon placeholder text
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 180px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍳', CARD_WIDTH / 2, PHOTO_SECTION_HEIGHT / 2);
    ctx.textAlign = 'left';
  }

  private _drawChip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
    const label = text.charAt(0).toUpperCase() + text.slice(1);
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    const textWidth = ctx.measureText(label).width;
    const chipW = textWidth + 40;
    const chipH = 56;
    const radius = chipH / 2;

    this._drawRoundedRect(ctx, x, y, chipW, chipH, radius);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 20, y + chipH / 2);
  }

  private _drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  private _wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
