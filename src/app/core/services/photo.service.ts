import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private storage = inject(Storage);

  async capturePhoto(): Promise<Blob> {
    if (Capacitor.isNativePlatform()) {
      return this.captureNative();
    }
    return this.captureWeb();
  }

  private async captureNative(): Promise<Blob> {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      quality: 80,
    });
    const response = await fetch(photo.webPath!);
    return response.blob();
  }

  private captureWeb(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          resolve(file);
        } else {
          reject(new Error('No file selected'));
        }
      };
      input.click();
    });
  }

  async uploadRecipePhoto(recipeId: string, blob: Blob, index: number): Promise<string> {
    const path = `recipes/${recipeId}/photos/${index}_${Date.now()}.jpg`;
    const storageRef = ref(this.storage, path);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  }

  async deleteRecipePhoto(fullPath: string): Promise<void> {
    const storageRef = ref(this.storage, fullPath);
    await deleteObject(storageRef);
  }

  async uploadAvatarPhoto(uid: string, blob: Blob): Promise<string> {
    const path = `avatars/${uid}/avatar_${Date.now()}.jpg`;
    const storageRef = ref(this.storage, path);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  }
}
