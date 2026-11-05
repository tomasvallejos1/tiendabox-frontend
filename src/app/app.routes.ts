import { Routes } from '@angular/router';

import { AdminLayout } from './layout/admin-layout/admin-layout';
import { AdminCustomerList } from './customer/admin-customer-list/admin-customer-list';
import { CustomerForm } from './customer/customer-form/customer-form';
import { AdminOrderList } from './order/admin-order-list/admin-order-list';
import { AdminOrderForm } from './order/admin-order-form/admin-order-form';
import { CartPage } from './cart/cart-page/cart-page';
import { ChangePassword } from './auth/change-password/change-password';
import { Login } from './auth/login/login';
import { NotFound } from './layout/not-found/not-found';
import { OrderDetail } from './order/order-detail/order-detail';
import { OrderList } from './order/order-list/order-list';
import { Profile } from './auth/profile/profile';
import { Register } from './auth/register/register';
import { AdminBrandList } from './brand/admin-brand-list/admin-brand-list';
import { AdminCategoryList } from './category/admin-category-list/admin-category-list';
import { AdminProductList } from './product/admin-product-list/admin-product-list';
import { BrandForm } from './brand/brand-form/brand-form';
import { CategoryForm } from './category/category-form/category-form';
import { ProductDetail } from './product/product-detail/product-detail';
import { ProductForm } from './product/product-form/product-form';
import { ProductList } from './product/product-list/product-list';
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

  { path: 'productos', component: ProductList },
  { path: 'producto/:id', component: ProductDetail },

  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard, roleGuard('owner')],
    children: [
      { path: '', redirectTo: 'pedidos', pathMatch: 'full' },
      { path: 'pedidos', component: AdminOrderList },
      { path: 'pedidos/new', component: AdminOrderForm },
      { path: 'clientes', component: AdminCustomerList },
      { path: 'clientes/new', component: CustomerForm },
      { path: 'clientes/:id/edit', component: CustomerForm },
      { path: 'productos', component: AdminProductList },
      { path: 'productos/new', component: ProductForm },
      { path: 'productos/:id/edit', component: ProductForm },
      { path: 'categorias', component: AdminCategoryList },
      { path: 'categorias/new', component: CategoryForm },
      { path: 'categorias/:id/edit', component: CategoryForm },
      { path: 'marcas', component: AdminBrandList },
      { path: 'marcas/new', component: BrandForm },
      { path: 'marcas/:id/edit', component: BrandForm },
      { path: 'contrasena', component: ChangePassword },
    ],
  },
  { path: '**', component: NotFound },
];
