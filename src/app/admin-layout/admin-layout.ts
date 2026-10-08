import { Component, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  protected readonly isDesktop = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly sections = [
    { path: '/admin/pedidos', label: 'Pedidos', icon: 'receipt_long' },
    { path: '/admin/productos', label: 'Productos', icon: 'inventory_2' },
    { path: '/admin/categorias', label: 'Categorías', icon: 'category' },
    { path: '/admin/marcas', label: 'Marcas', icon: 'branding_watermark' },
    { path: '/admin/clientes', label: 'Clientes', icon: 'people' },
  ];

  constructor(breakpointObserver: BreakpointObserver, destroyRef: DestroyRef) {
    breakpointObserver
      .observe('(min-width: 960px)')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((result) => {
        this.isDesktop.set(result.matches);
        this.menuOpen.set(false);
      });
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
