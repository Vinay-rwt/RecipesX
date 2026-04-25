import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { EditProfilePage } from './edit-profile.page';

const routes: Routes = [{ path: '', component: EditProfilePage }];

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [EditProfilePage],
})
export class EditProfilePageModule {}
