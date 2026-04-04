import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FeedPageRoutingModule } from './feed-routing.module';
import { FeedPage } from './feed.page';

@NgModule({
  imports: [CommonModule, IonicModule, FeedPageRoutingModule],
  declarations: [FeedPage],
})
export class FeedPageModule {}
