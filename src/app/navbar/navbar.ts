import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';

import { AuthService } from '../shared/auth-service';
import { CartService } from '../shared/cart-service';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected readonly mobileMenuOpen = signal(false);

  constructor(
    protected authService: AuthService,
    protected cartService: CartService,
    private router: Router,
  ) {
    if (this.authService.isLoggedIn() && this.authService.isCliente()) {
      this.cartService.refresh();
    }
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/productos']);
    });
  }
}
