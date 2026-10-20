import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatBadge } from '@angular/material/badge';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { Navbar } from './navbar';
import { AuthService } from '../shared/auth-service';
import { CartService } from '../shared/cart-service';

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let cartService: CartService;
  const role = signal<string | null>(null);
  const auth = {
    isLoggedIn: computed(() => role() !== null),
    isCliente: computed(() => role() === 'cliente'),
    isOwner: computed(() => role() === 'owner'),
    logout: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    role.set(null);
    auth.logout.mockClear();
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Navbar);
    cartService = TestBed.inject(CartService);
    await fixture.whenStable();
  });

  async function openMenu(): Promise<HTMLElement> {
    fixture.nativeElement.querySelector('.navbar-toggle').click();
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.navbar-mobile-menu');
  }

  function setItemCount(count: number): void {
    cartService.setCart({
      id: 'cart-1',
      customer_id: 'customer-1',
      updated_at: '2026-10-20T12:00:00Z',
      items: [],
      item_count: count,
      total: 0,
      has_encargo_items: false,
      has_unavailable_items: false,
    });
  }

  it('muestra un único carrito para el cliente, en la barra y fuera del menú', async () => {
    role.set('cliente');
    await fixture.whenStable();
    const cart: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '.navbar-content > .navbar-cart',
    );
    expect(cart).not.toBeNull();
    expect(cart.getAttribute('href')).toBe('/carrito');
    expect(cart.querySelector('mat-icon')?.textContent).toContain('shopping_cart');
    const menu = await openMenu();
    expect(menu.querySelector('a[href="/carrito"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('a[href="/carrito"]')).toHaveLength(1);
    cart.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.navbar-mobile-menu')).toBeNull();
  });

  it.each(['owner', null])('oculta el carrito para el rol %s', async (currentRole) => {
    role.set(currentRole);
    setItemCount(5);
    await fixture.whenStable();
    await openMenu();
    expect(fixture.nativeElement.querySelector('a[href="/carrito"]')).toBeNull();
  });

  it('mantiene el badge visible con cero y actualiza la cantidad desde CartService', async () => {
    role.set('cliente');
    await fixture.whenStable();
    const badge = fixture.debugElement.query(By.directive(MatBadge)).injector.get(MatBadge);
    expect(badge.hidden).toBe(false);
    expect(fixture.nativeElement.querySelector('.navbar-cart .mat-badge-content').textContent).toBe(
      '0',
    );

    setItemCount(5);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.navbar-cart .mat-badge-content').textContent).toBe(
      String(cartService.itemCount()),
    );
    expect(
      fixture.nativeElement.querySelector('.navbar-cart').getAttribute('aria-label'),
    ).toContain('5 productos');

    cartService.setCart(null);
    await fixture.whenStable();
    expect(badge.hidden).toBe(false);
    expect(fixture.nativeElement.querySelector('.navbar-cart .mat-badge-content').textContent).toBe(
      '0',
    );
  });

  it.each([
    { currentRole: null, labels: ['Catálogo', 'Ingresar', 'Crear cuenta'] },
    { currentRole: 'cliente', labels: ['Catálogo', 'Mis pedidos', 'Mi perfil', 'Salir'] },
    {
      currentRole: 'owner',
      labels: ['Catálogo', 'Productos', 'Categorías', 'Marcas', 'Pedidos', 'Clientes', 'Salir'],
    },
  ])(
    'muestra todas las opciones de $currentRole y cierra al elegir cada una',
    async ({ currentRole, labels }) => {
      role.set(currentRole);
      await fixture.whenStable();
      let menu = await openMenu();
      expect(
        Array.from(menu.querySelectorAll('a,button'), (element) => element.textContent?.trim()),
      ).toEqual(labels);
      expect(
        fixture.nativeElement.querySelector('.navbar-toggle').getAttribute('aria-expanded'),
      ).toBe('true');
      expect(menu.closest('mat-toolbar')).toBeNull();

      for (let index = 0; index < labels.length; index++) {
        if (index > 0) menu = await openMenu();
        menu.querySelectorAll<HTMLElement>('a,button')[index].click();
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelector('.navbar-mobile-menu')).toBeNull();
        expect(
          fixture.nativeElement.querySelector('.navbar-toggle').getAttribute('aria-expanded'),
        ).toBe('false');
      }
      if (currentRole) expect(auth.logout).toHaveBeenCalledOnce();
    },
  );
});
