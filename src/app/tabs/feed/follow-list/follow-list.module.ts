import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { FollowListPage } from './follow-list.page';

const routes: Routes = [{ path: '', component: FollowListPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [FollowListPage],
})
export class FollowListPageModule {}
