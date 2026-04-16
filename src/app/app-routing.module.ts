import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/onboarding/onboarding.module').then(m => m.OnboardingModule),
  },
  {
    path: 'recipe',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/recipe/recipe.module').then(m => m.RecipeModule),
  },
  {
    path: '',
    canActivate: [authGuard, onboardingGuard],
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
