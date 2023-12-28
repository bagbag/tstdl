import type { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  { path: 'card', loadComponent: () => import('./examples/card/card.component') },
  { path: 'data-card', loadComponent: () => import('./examples/data-card-example/data-card-example.component') },
  { path: 'data-grid', loadComponent: () => import('./examples/data-grid/data-grid.component') },
  { path: 'react', loadComponent: () => import('./examples/react/react.component') },
  { path: 'markdown', loadComponent: () => import('./examples/markdown/markdown.component') }
];

export default APP_ROUTES;
