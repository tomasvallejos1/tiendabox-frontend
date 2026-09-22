import { Routes } from '@angular/router';

import { NotFound } from './not-found/not-found';
import { ProductList } from './product-list/product-list';

// Rutas eager: cada ruta referencia el componente con `component:` (nunca `loadComponent:`).
// Las rutas nuevas se agregan ANTES del comodín '**', que siempre va último.
export const routes: Routes = [
  { path: '', redirectTo: '/productos', pathMatch: 'full' },
  { path: 'productos', component: ProductList },
  { path: '**', component: NotFound },
];
