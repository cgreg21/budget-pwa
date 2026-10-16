import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./app.component').then((module) => module.AppComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'budget' },
      { path: 'budget', loadComponent: () => import('./pages/budget/budget.page').then((module) => module.BudgetPage) },
      { path: 'categories', loadComponent: () => import('./pages/categories/categories.page').then((module) => module.CategoriesPage) },
      { path: 'schedule', loadComponent: () => import('./pages/schedule/schedule.page').then((module) => module.SchedulePage) },
      { path: 'stats', loadComponent: () => import('./pages/stats/stats.page').then((module) => module.StatsPage) },
      { path: 'history', loadComponent: () => import('./pages/history/history.page').then((module) => module.HistoryPage) },
      { path: 'trash', loadComponent: () => import('./pages/trash/trash.page').then((module) => module.TrashPage) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.page').then((module) => module.SettingsPage) },
      {
        path: 'settings/profiles',
        loadComponent: () => import('./pages/settings/profiles.page').then((module) => module.ProfilesPage),
      },
      { path: '**', redirectTo: 'budget' },
    ],
  },
];
