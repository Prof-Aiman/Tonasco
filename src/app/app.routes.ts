import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AddInventoryComponent } from './pages/add-inventory/add-inventory.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Tonasco Jig Management' },
  { path: 'add-inventory', component: AddInventoryComponent, title: 'Add Inventory | Tonasco' },
  { path: '**', redirectTo: '' }
];
