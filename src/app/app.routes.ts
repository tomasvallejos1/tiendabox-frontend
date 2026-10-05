import { Routes } from '@angular/router';

import { AdminOrderList } from './admin-order-list/admin-order-list';
import { CartPage } from './cart-page/cart-page';
import { Login } from './login/login';
import { NotFound } from './not-found/not-found';
import { OrderDetail } from './order-detail/order-detail';
import { OrderList } from './order-list/order-list';
import { Profile } from './profile/profile';
import { Register } from './register/register';
import { AdminBrandList } from './admin-brand-list/admin-brand-list';
import { AdminCategoryList } from './admin-category-list/admin-category-list';
import { AdminProductList } from './admin-product-list/admin-product-list';
import { BrandForm } from './brand-form/brand-form';
import { CategoryForm } from './category-form/category-form';
import { ProductDetail } from './product-detail/product-detail';
import { ProductForm } from './product-form/product-form';
import { ProductList } from './product-list/product-list';
import { authGuard } from './shared/auth-guard';
import { roleGuard } from './shared/role-guard';

// Rutas eager: cada ruta referencia el componente con `component:` (nunca `loadComponent:`).
// Las rutas nuevas se agregan ANTES del comodín '**', que siempre va último.
export const routes: Routes = [
  { path: '', redirectTo: '/productos', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'registro', component: Register },
  { path: 'perfil', component: Profile, canActivate: [authGuard] },
  { path: 'carrito', component: CartPage, canActivate: [authGuard, roleGuard('cliente')] },
  { path: 'mis-pedidos', component: OrderList, canActivate: [authGuard, roleGuard('cliente')] },
  { path: 'pedido/:id', component: OrderDetail, canActivate: [authGuard] },
  {
    path: 'admin/pedidos',
    component: AdminOrderList,
    canActivate: [authGuard, roleGuard('owner')],
  },
  { path: 'productos', component: ProductList },
  { path: 'producto/:id', component: ProductDetail },
  {
    path: 'admin/productos',
    component: AdminProductList,
    canActivate: [authGuard, roleGuard('owner')],
  },
  {
    path: 'admin/productos/new',
    component: ProductForm,
    canActivate: [authGuard, roleGuard('owner')],
  },
  {
    path: 'admin/productos/:id/edit',
    component: ProductForm,
    canActivate: [authGuard, roleGuard('owner')],
  },
  {
    path: 'admin/categorias',
    component: AdminCategoryList,
    canActivate: [authGuard, roleGuard('owner')],
  },
  {
    path: 'admin/categorias/new',
    component: CategoryForm,
    canActivate: [authGuard, roleGuard('owner')],
  },
  {
    path: 'admin/categorias/:id/edit',
    component: CategoryForm,
    canActivate: [authGuard, roleGuard('owner')],
  },
  { path: 'admin/marcas', component: AdminBrandList, canActivate: [authGuard, roleGuard('owner')] },
  { path: 'admin/marcas/new', component: BrandForm, canActivate: [authGuard, roleGuard('owner')] },
  {
    path: 'admin/marcas/:id/edit',
    component: BrandForm,
    canActivate: [authGuard, roleGuard('owner')],
  },
  { path: '**', component: NotFound },
];
