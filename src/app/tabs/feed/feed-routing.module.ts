import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeedPage } from './feed.page';

const routes: Routes = [
  { path: '', component: FeedPage },
  {
    path: 'user/:uid',
    loadChildren: () =>
      import('./user-profile/user-profile.module').then(m => m.UserProfilePageModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FeedPageRoutingModule {}
