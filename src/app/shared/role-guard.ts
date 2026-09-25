import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth-service';

// Fábrica de guards: se usa en las rutas como canActivate: [roleGuard('owner')].
export const roleGuard =
  (role: string): CanActivateFn =>
  () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    // Logueado pero con otro rol: vuelve al catálogo, que es público.
    if (authService.user()?.role !== role) {
      router.navigate(['/productos']);
      return false;
    }

    return true;
  };
