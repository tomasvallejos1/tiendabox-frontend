import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';
import { AuthService } from './auth-service';

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('tiendabox_token', 'token-actual');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('cambia la contraseña con PUT /auth/password sin tocar la sesión local', () => {
    const service = TestBed.inject(AuthService);
    let completed = false;
    service
      .changePassword('vieja123', 'nueva123')
      .subscribe({ complete: () => (completed = true) });

    const request = http.expectOne(`${environment.apiUrl}/auth/password`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      current_password: 'vieja123',
      new_password: 'nueva123',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
    expect(service.getToken()).toBe('token-actual');
    expect(service.isLoggedIn()).toBe(true);
    expect(localStorage.getItem('tiendabox_token')).toBe('token-actual');
  });
});
