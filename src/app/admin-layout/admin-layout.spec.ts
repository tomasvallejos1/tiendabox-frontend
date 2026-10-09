import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { By } from '@angular/platform-browser';
import { MatSidenav } from '@angular/material/sidenav';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { AdminLayout } from './admin-layout';
import { routes } from '../app.routes';
import { AuthService } from '../shared/auth-service';

describe('AdminLayout', () => {
  const breakpoint = new BehaviorSubject({ matches: false, breakpoints: {} });
  let fixture: ComponentFixture<AdminLayout>;

  beforeEach(async () => {
    breakpoint.next({ matches: false, breakpoints: {} });
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([]),
        { provide: BreakpointObserver, useValue: { observe: () => breakpoint } },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(AdminLayout);
    await fixture.whenStable();
  });

  it('opens mobile navigation from the hamburger and closes after choosing a section', async () => {
    const sidenav = fixture.debugElement.query(By.directive(MatSidenav))
      .componentInstance as MatSidenav;
    expect(sidenav.mode).toBe('over');
    expect(sidenav.opened).toBe(false);
    fixture.nativeElement.querySelector('.panel-toolbar button').click();
    await fixture.whenStable();
    expect(sidenav.opened).toBe(true);
    fixture.nativeElement.querySelector('a[href="/admin/pedidos"]').click();
    await fixture.whenStable();
    expect(sidenav.opened).toBe(false);
  });

  it('keeps desktop navigation visible and resets to closed when resizing to mobile', async () => {
    const sidenav = fixture.debugElement.query(By.directive(MatSidenav))
      .componentInstance as MatSidenav;
    breakpoint.next({ matches: true, breakpoints: {} });
    await fixture.whenStable();
    expect(sidenav.mode).toBe('side');
    expect(sidenav.opened).toBe(true);
    expect(fixture.nativeElement.querySelector('.panel-toolbar')).toBeNull();
    fixture.componentInstance['closeMenu']();
    await fixture.whenStable();
    expect(sidenav.opened).toBe(true);
    breakpoint.next({ matches: false, breakpoints: {} });
    await fixture.whenStable();
    expect(sidenav.mode).toBe('over');
    expect(sidenav.opened).toBe(false);
  });

  it('closes from the close button and the backdrop', async () => {
    fixture.componentInstance['menuOpen'].set(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.navigation-header button').click();
    await fixture.whenStable();
    expect(fixture.componentInstance['menuOpen']()).toBe(false);
    fixture.componentInstance['menuOpen'].set(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.mat-drawer-backdrop').click();
    await fixture.whenStable();
    expect(fixture.componentInstance['menuOpen']()).toBe(false);
  });
});

describe('Admin routes', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { isLoggedIn: () => true, user: () => ({ role: 'owner' }) },
        },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => new BehaviorSubject({ matches: true, breakpoints: {} }) },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushReads(): void {
    http
      .match(() => true)
      .forEach((request) => {
        expect(request.request.method).toBe('GET');
        const singular = /\/(product|category|brand)\/test-id$/.test(request.request.url);
        request.flush(
          singular
            ? {
                id: 'test-id',
                name: 'Prueba',
                description: null,
                type: 'stock',
                price: 100,
                stock: 3,
                category_id: '',
                brand_id: '',
                logo_url: null,
              }
            : [],
        );
      });
  }

  it('navigates every existing admin list and form inside the same layout', async () => {
    const harness = await RouterTestingHarness.create();
    const destinations = [
      ['/admin', 'app-admin-order-list', '/admin/pedidos', '/admin/pedidos'],
      ['/admin/productos', 'app-admin-product-list', '/admin/productos', '/admin/productos'],
      ['/admin/productos/new', 'app-product-form', '/admin/productos/new', '/admin/productos'],
      [
        '/admin/productos/test-id/edit',
        'app-product-form',
        '/admin/productos/test-id/edit',
        '/admin/productos',
      ],
      ['/admin/categorias', 'app-admin-category-list', '/admin/categorias', '/admin/categorias'],
      ['/admin/categorias/new', 'app-category-form', '/admin/categorias/new', '/admin/categorias'],
      [
        '/admin/categorias/test-id/edit',
        'app-category-form',
        '/admin/categorias/test-id/edit',
        '/admin/categorias',
      ],
      ['/admin/marcas', 'app-admin-brand-list', '/admin/marcas', '/admin/marcas'],
      ['/admin/marcas/new', 'app-brand-form', '/admin/marcas/new', '/admin/marcas'],
      [
        '/admin/marcas/test-id/edit',
        'app-brand-form',
        '/admin/marcas/test-id/edit',
        '/admin/marcas',
      ],
    ];
    let layout: AdminLayout | undefined;
    for (const [url, selector, expectedUrl, activeLink] of destinations) {
      const current = await harness.navigateByUrl(url, AdminLayout);
      if (layout) expect(current).toBe(layout);
      layout = current;
      flushReads();
      harness.detectChanges();
      await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe(expectedUrl);
      expect(harness.routeNativeElement?.querySelector(selector)).not.toBeNull();
      expect(harness.routeNativeElement?.querySelector('h1')).not.toBeNull();
      expect(harness.routeNativeElement?.querySelector('a.active-link')?.getAttribute('href')).toBe(
        activeLink,
      );
    }
    const parent = routes.find((route) => route.path === 'admin')!;
    expect(parent.canActivate).toHaveLength(2);
    expect(parent.children?.every((route) => !route.canActivate)).toBe(true);
  });
});
