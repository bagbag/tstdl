import { NgModule } from '@angular/core';
import type { Routes } from '@angular/router';
import { RouterModule } from '@angular/router';
import { CardComponent } from './examples/card/card.component';
import { DataGridComponent } from './examples/data-grid/data-grid.component';
import { ReactComponent } from './examples/react/react.component';

const routes: Routes = [
  { path: 'card', component: CardComponent },
  { path: 'data-grid', component: DataGridComponent },
  { path: 'react', component: ReactComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
