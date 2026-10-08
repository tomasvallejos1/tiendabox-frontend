import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { AdminCustomerList } from './admin-customer-list';
import { CustomerWithEmail } from '../shared/customer';
import { environment } from '../../environments/environment';

const local: CustomerWithEmail = {
  id: 'local',
  user_id: null,
  name: 'Ana',
  email: null,
  government_id: '20123456789',
  tax_status: 'consumidor_final',
  phone: null,
  address: null,
  created_at: '',
};
const web: CustomerWithEmail = {
  ...local,
  id: 'web',
  user_id: 'user',
  name: 'Bruno',
  email: 'bruno@example.com',
};
describe('AdminCustomerList', () => {
  let http: HttpTestingController;
  let confirmed: boolean;
  const snack = vi.fn();
  beforeEach(async () => {
    confirmed = true;
    snack.mockClear();
    await TestBed.configureTestingModule({
      imports: [AdminCustomerList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(confirmed) }) } },
        { provide: MatSnackBar, useValue: { open: snack } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('filters name, email and CUIT in memory and distinguishes local clients', async () => {
    const fixture = TestBed.createComponent(AdminCustomerList);
    await fixture.whenStable();
    http.expectOne(environment.apiUrl + '/customers').flush([local, web]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sin cuenta web');
    const component = fixture.componentInstance;
    for (const [query, expected] of [
      ['ana', 'local'],
      ['bruno@', 'web'],
    ] as const) {
      component['search'].set(query);
      expect(component['filteredCustomers']().map((c) => c.id)).toEqual([expected]);
    }
    component['search'].set('20123456789');
    expect(component['filteredCustomers']()).toHaveLength(2);
    component['accountFilter'].set('local');
    expect(component['filteredCustomers']()).toEqual([local]);
    component['accountFilter'].set('web');
    expect(component['filteredCustomers']()).toEqual([web]);
    http.expectNone(environment.apiUrl + '/customers');
  });

  it('confirms deletion, displays backend errors and removes successful deletions', async () => {
    const fixture = TestBed.createComponent(AdminCustomerList);
    await fixture.whenStable();
    http.expectOne(environment.apiUrl + '/customers').flush([local]);
    const component = fixture.componentInstance;
    confirmed = false;
    component['confirmDelete'](local);
    http.expectNone(environment.apiUrl + '/customer/local');
    confirmed = true;
    component['confirmDelete'](local);
    const failed = http.expectOne(environment.apiUrl + '/customer/local');
    expect(failed.request.method).toBe('DELETE');
    failed.flush({ message: 'El cliente tiene pedidos' }, { status: 409, statusText: 'Conflict' });
    expect(snack).toHaveBeenCalledWith('El cliente tiene pedidos', 'Cerrar', expect.anything());
    expect(component['customers']()).toHaveLength(1);
    component['confirmDelete'](local);
    http.expectOne(environment.apiUrl + '/customer/local').flush(null);
    expect(component['customers']()).toHaveLength(0);
  });

  it('shows load errors and can retry', async () => {
    const fixture = TestBed.createComponent(AdminCustomerList);
    await fixture.whenStable();
    http
      .expectOne(environment.apiUrl + '/customers')
      .flush({ message: 'Acceso denegado' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Acceso denegado');
    fixture.componentInstance['loadCustomers']();
    http.expectOne(environment.apiUrl + '/customers').flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay clientes');
  });
});
