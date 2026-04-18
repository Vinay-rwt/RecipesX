import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfilePage } from './profile.page';

const routes: Routes = [
  { path: '', component: ProfilePage },
  {
    path: 'collections',
    loadChildren: () =>
      import('./collections/collections.module').then(m => m.CollectionsPageModule),
  },
  {
    path: 'collection/:id',
    loadChildren: () =>
      import('./collection-detail/collection-detail.module').then(m => m.CollectionDetailPageModule),
  },
  {
    path: 'follow-list/:uid/:type',
    loadChildren: () =>
      import('../feed/follow-list/follow-list.module').then(m => m.FollowListPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfilePageRoutingModule {}
