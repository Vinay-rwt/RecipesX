import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CreatePageRoutingModule } from './create-routing.module';
import { CreatePage } from './create.page';

@NgModule({
  imports: [CommonModule, IonicModule, CreatePageRoutingModule],
  declarations: [CreatePage],
})
export class CreatePageModule {}
