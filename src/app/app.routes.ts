import { Routes } from '@angular/router';

import { NotFound } from './not-found/not-found';
import { Profile } from './profile/profile';
import { authGuard } from './shared/auth-guard';

// Rutas eager: cada ruta referencia el componente con `component:` (nunca `loadComponent:`).
// Las rutas nuevas se agregan ANTES del comodín '**', que siempre va último.
export const routes: Routes = [
  { path: '', redirectTo: '/productos', pathMatch: 'full' },
  { path: 'perfil', component: Profile, canActivate: [authGuard] },
  { path: '**', component: NotFound },
];
