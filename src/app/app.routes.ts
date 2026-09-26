import { Routes } from '@angular/router';

import { CartPage } from './cart-page/cart-page';
import { NotFound } from './not-found/not-found';
import { OrderList } from './order-list/order-list';
import { Profile } from './profile/profile';
import { authGuard } from './shared/auth-guard';
import { roleGuard } from './shared/role-guard';

// Rutas eager: cada ruta referencia el componente con `component:` (nunca `loadComponent:`).
// Las rutas nuevas se agregan ANTES del comodín '**', que siempre va último.
export const routes: Routes = [
  { path: '', redirectTo: '/productos', pathMatch: 'full' },
  { path: 'perfil', component: Profile, canActivate: [authGuard] },
  { path: 'carrito', component: CartPage, canActivate: [authGuard, roleGuard('cliente')] },
  { path: 'mis-pedidos', component: OrderList, canActivate: [authGuard, roleGuard('cliente')] },
  { path: '**', component: NotFound },
];

