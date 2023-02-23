import { NgModule } from '@angular/core';
import type { Routes } from '@angular/router';
import { RouterModule } from '@angular/router';
import { DataGridComponent } from './examples/data-grid/data-grid.component';

const routes: Routes = [
  {
    path: 'data-grid',
    component: DataGridComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
