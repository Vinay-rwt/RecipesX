import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Recipe } from '../models/recipe.model';

@Injectable({ providedIn: 'root' })
export class ShareService {

  async shareText(recipe: Recipe): Promise<void> {
    const ingredientsList = recipe.ingredients
      .map(i => `  • ${i.quantity ? i.quantity + ' ' + i.unit + ' ' : ''}${i.name}`)
      .join('\n');

    const directionsList = recipe.steps
      .map(s => `  ${s.order}. ${s.instruction}`)
      .join('\n');

    const text =
      `🍳 ${recipe.title}\n\n` +
      `${recipe.description ? recipe.description + '\n\n' : ''}` +
      `Cuisine: ${recipe.cuisineType} | Difficulty: ${recipe.difficulty}\n` +
      `Prep: ${recipe.prepTime}m | Cook: ${recipe.cookTime}m | Servings: ${recipe.baseServings}\n\n` +
      `Ingredients:\n${ingredientsList}\n\n` +
      `Directions:\n${directionsList}\n\n` +
      `Shared from RecipeShare`;

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      await Share.share({
        title: recipe.title,
        text,
        dialogTitle: 'Share Recipe',
      });
    } else if (navigator.share) {
      await navigator.share({ title: recipe.title, text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  async shareImage(recipe: Recipe, imageBlob: Blob): Promise<void> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // Write blob to a temp file, then share via file:// URI
      const base64 = await this._blobToBase64(imageBlob);
      const fileName = `recipe-${recipe.id ?? Date.now()}.png`;
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: recipe.title,
        url: writeResult.uri,
        dialogTitle: 'Share Recipe Image',
      });
    } else {
      const file = new File([imageBlob], `${recipe.title}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: recipe.title });
      } else {
        // Fallback: trigger download
        const url = URL.createObjectURL(imageBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${recipe.title}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  }

  async copyLink(recipeId: string): Promise<void> {
    const url = `https://recipeshare.app/recipe/${recipeId}`;
    await navigator.clipboard.writeText(url);
  }

  private _blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // FileReader result is "data:image/png;base64,<data>" — Filesystem needs just the data part
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
