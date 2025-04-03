import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'button', loadComponent: () => import('./examples/button/button.component').then((module) => module.ButtonComponent) },
  { path: 'icon', loadComponent: () => import('./examples/icon-example/icon-example.component').then((module) => module.IconExampleComponent) },
  { path: 'form', loadComponent: () => import('./examples/form/form.component').then((module) => module.FormComponent) },
  { path: 'nav-tabs', loadComponent: () => import('./examples/nav-tabs/nav-tabs.component').then((module) => module.NavTabsExampleComponent) },
  { path: 'card', loadComponent: () => import('./examples/card/card.component') },
  { path: 'drawer-card', loadComponent: () => import('./examples/drawer-card-example/drawer-card-example.component').then((module) => module.DrawerCardExampleComponent) },
  { path: 'dialog', loadComponent: () => import('./examples/dialog-example/dialog-example.component').then((module) => module.DialogExampleComponent) },
  { path: 'data-grid', loadComponent: () => import('./examples/data-grid/data-grid.component') },
  { path: 'vertical-tab-group', loadComponent: () => import('./examples/vertical-tab-group-example/vertical-tab-group-example.component').then((module) => module.VerticalTabGroupExampleComponent) },
  { path: 'react', loadComponent: () => import('./examples/react/react.component') },
  { path: 'markdown', loadComponent: () => import('./examples/markdown/markdown.component') },
  { path: 'misc', loadComponent: () => import('./examples/misc-examples/misc-examples.component').then((module) => module.MiscExamplesComponent) }
];
