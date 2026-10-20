import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function submit(password: string): Promise<void> {
    fixture.componentInstance['form'].setValue({
      name: 'María Pérez',
      email: 'maria@example.com',
      password,
    });
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  it('rechaza cinco caracteres y permite registrarse con exactamente seis', async () => {
    await submit('12345');
    expect(fixture.nativeElement.textContent).toContain('Mínimo 6 caracteres.');
    http.expectNone(() => true);
    expect(router.navigate).not.toHaveBeenCalled();

    await submit('123456');
    const request = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'María Pérez',
      email: 'maria@example.com',
      password: '123456',
    });
    request.flush({
      user: { id: 'user-1', email: 'maria@example.com', role: 'cliente' },
      customer: { id: 'customer-1', name: 'María Pérez' },
    });
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
  });

  it('muestra el 409 de email duplicado y rehabilita el formulario sin navegar', async () => {
    await submit('123456');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    http
      .expectOne(`${environment.apiUrl}/auth/register`)
      .flush({ error: 'El email ya está registrado' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'El email ya está registrado',
    );
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
