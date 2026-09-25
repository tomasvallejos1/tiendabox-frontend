import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
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
    MatMenuModule,
    MatBadgeModule,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected mobileMenuOpen = false;

  constructor(
    protected authService: AuthService,
    protected cartService: CartService,
    private router: Router,
  ) {}

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/productos']);
    });
  }
}
