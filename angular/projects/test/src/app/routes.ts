import type { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  { path: 'card', loadComponent: () => import('./examples/card/card.component') },
  { path: 'data-grid', loadComponent: () => import('./examples/data-grid/data-grid.component') },
  { path: 'react', loadComponent: () => import('./examples/react/react.component') }
];

export default APP_ROUTES;
