import { Component, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AlertController, ToastController, ViewWillEnter } from '@ionic/angular';
import { CollectionService } from '../../../core/services/collection.service';
import { Collection } from '../../../core/models/collection.model';

const DEFAULT_EMOJIS = ['📚', '🍝', '🥗', '🍜', '🍱', '🥘', '🍲', '🥩', '🫕', '🍛'];

@Component({
  selector: 'app-collections',
  templateUrl: './collections.page.html',
  styleUrls: ['./collections.page.scss'],
  standalone: false,
})
export class CollectionsPage implements ViewWillEnter {
  private auth = inject(Auth);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  readonly collectionService = inject(CollectionService);

  ionViewWillEnter(): void {
    const uid = this.auth.currentUser?.uid;
    if (uid) this.collectionService.loadCollections(uid);
  }

  async onCreateCollection(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'New Collection',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'e.g. Weeknight Dinners',
          attributes: { maxlength: 40 },
        },
        {
          name: 'emoji',
          type: 'text',
          placeholder: 'Emoji (e.g. 🍝)',
          value: DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)],
          attributes: { maxlength: 4 },
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: async (data): Promise<boolean> => {
            const name = data.name?.trim();
            if (!name) return false;
            const emoji = data.emoji?.trim() || '📚';
            const uid = this.auth.currentUser?.uid;
            if (!uid) return false;
            try {
              await this.collectionService.createCollection(uid, name, emoji);
              this._showToast(`"${name}" created`);
            } catch {
              this._showToast('Failed to create collection');
            }
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async onDeleteCollection(col: Collection, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Collection',
      message: `Delete "${col.name}"? The recipes won't be removed from your saves.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const uid = this.auth.currentUser?.uid;
            if (!uid) return;
            try {
              await this.collectionService.deleteCollection(uid, col.id!);
              this._showToast(`"${col.name}" deleted`);
            } catch {
              this._showToast('Failed to delete collection');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  openCollection(col: Collection): void {
    this.router.navigate(['/tabs/profile/collection', col.id]);
  }

  private async _showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    await toast.present();
  }
}
