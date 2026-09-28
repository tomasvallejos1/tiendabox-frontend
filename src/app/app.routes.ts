import { Routes } from '@angular/router';

import { AdminProductList } from './admin-product-list/admin-product-list';
import { NotFound } from './not-found/not-found';
import { ProductDetail } from './product-detail/product-detail';
import { ProductForm } from './product-form/product-form';
import { ProductList } from './product-list/product-list';
import { authGuard } from './shared/auth-guard';
import { roleGuard } from './shared/role-guard';

// Rutas eager: cada ruta referencia el componente con `component:` (nunca `loadComponent:`).
// Las rutas nuevas se agregan ANTES del comodín '**', que siempre va último.
export const routes: Routes = [
  { path: '', redirectTo: '/productos', pathMatch: 'full' },
  { path: 'productos', component: ProductList },
  { path: 'producto/:id', component: ProductDetail },
  { path: 'admin/productos', component: AdminProductList, canActivate: [authGuard, roleGuard('owner')] },
  { path: 'admin/productos/new', component: ProductForm, canActivate: [authGuard, roleGuard('owner')] },
  { path: 'admin/productos/:id/edit', component: ProductForm, canActivate: [authGuard, roleGuard('owner')] },
  { path: '**', component: NotFound },
];


