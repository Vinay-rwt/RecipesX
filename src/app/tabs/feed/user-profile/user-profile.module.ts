import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { UserProfilePage } from './user-profile.page';

const routes: Routes = [{ path: '', component: UserProfilePage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule],
  declarations: [UserProfilePage],
})
export class UserProfilePageModule {}
