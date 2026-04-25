import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { CollectionDetailPage } from './collection-detail.page';
import { SharedModule } from '../../../shared/shared.module';

const routes: Routes = [{ path: '', component: CollectionDetailPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule],
  declarations: [CollectionDetailPage],
})
export class CollectionDetailPageModule {}
