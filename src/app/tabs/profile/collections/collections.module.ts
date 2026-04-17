import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { CollectionsPage } from './collections.page';

const routes: Routes = [{ path: '', component: CollectionsPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [CollectionsPage],
})
export class CollectionsPageModule {}
