import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController, ToastController } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { PhotoService } from '../../../core/services/photo.service';
import { CookingLevel } from '../../../core/models/user.model';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: false,
})
export class EditProfilePage implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private navCtrl = inject(NavController);
  private photoService = inject(PhotoService);
  private toastCtrl = inject(ToastController);
  readonly profileService = inject(UserProfileService);

  form!: FormGroup;
  saving = false;
  uploadingAvatar = signal(false);
  pendingPhotoURL = signal<string | null>(null);

  readonly cookingLevels: { value: CookingLevel; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'home_cook', label: 'Home Cook' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'professional', label: 'Professional' },
  ];

  ngOnInit(): void {
    const p = this.profileService.userProfile();
    this.pendingPhotoURL.set(p?.photoURL ?? null);
    this.form = this.fb.group({
      // Validators.pattern(/\S/) rejects whitespace-only input that Validators.required permits.
      displayName: [p?.displayName ?? '', [Validators.required, Validators.maxLength(50), Validators.pattern(/\S/)]],
      bio: [p?.bio ?? '', Validators.maxLength(160)],
      location: [p?.location ?? '', Validators.maxLength(60)],
      cookingLevel: [p?.cookingLevel ?? null],
      websiteUrl: [p?.websiteUrl ?? '', Validators.pattern(/^(https?:\/\/.+)?$/)],
    });
  }

  get bioLength(): number {
    return this.form.get('bio')?.value?.length ?? 0;
  }

  get displayPhotoURL(): string | null {
    return this.pendingPhotoURL();
  }

  get displayName(): string {
    return this.profileService.userProfile()?.displayName ?? '?';
  }

  async onAvatarTap(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid || this.uploadingAvatar()) return;
    try {
      this.uploadingAvatar.set(true);
      const blob = await this.photoService.capturePhoto();
      const url = await this.photoService.uploadAvatarPhoto(uid, blob);
      this.pendingPhotoURL.set(url);
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== 'No file selected') {
        await this._showToast('Failed to upload photo. Please try again.');
      }
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  async onSave(): Promise<void> {
    if (this.form.invalid || this.saving) return;
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    // Re-validate after trim — a value like "   " passes Validators.required but
    // is empty after trim. Pattern(/\S/) above prevents it, but this also normalizes
    // the persisted value.
    const trimmedName = this.form.value.displayName.trim();
    if (!trimmedName) {
      const ctrl = this.form.get('displayName');
      ctrl?.setValue(trimmedName);
      ctrl?.updateValueAndValidity();
      return;
    }

    this.saving = true;
    try {
      await this.profileService.updateProfile(uid, {
        displayName: trimmedName,
        photoURL: this.pendingPhotoURL(),
        bio: this.form.value.bio?.trim() || null,
        location: this.form.value.location?.trim() || null,
        cookingLevel: this.form.value.cookingLevel || null,
        websiteUrl: this.form.value.websiteUrl?.trim() || null,
      });
      this.navCtrl.back();
    } catch {
      await this._showToast('Failed to save profile. Please try again.');
    } finally {
      this.saving = false;
    }
  }

  private async _showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom' });
    await toast.present();
  }

  onCancel(): void {
    this.navCtrl.back();
  }
}
