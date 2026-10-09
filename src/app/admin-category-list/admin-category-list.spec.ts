import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { AdminCategoryList } from './admin-category-list';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { environment } from '../../environments/environment';

describe('AdminCategoryList', () => {
  let http: HttpTestingController;
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(false) })) };
  const snackBar = { open: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminCategoryList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('deletes only after confirming, preserves backend errors and reports success', async () => {
    const fixture = TestBed.createComponent(AdminCategoryList);
    vi.spyOn(fixture.debugElement.injector.get(MatSnackBar), 'open').mockImplementation(
      snackBar.open,
    );
    await fixture.whenStable();
    http.match(() => true).forEach((request) => request.flush([]));
    fixture.componentInstance.confirmDelete('test-id', 'Prueba');
    expect(dialog.open).toHaveBeenCalledWith(
      ConfirmDialog,
      expect.objectContaining({
        data: expect.objectContaining({ confirmText: 'Eliminar', isDestructive: true }),
      }),
    );
    http.expectNone(environment.apiUrl + '/category/test-id');
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    fixture.componentInstance.confirmDelete('test-id', 'Prueba');
    const request = http.expectOne(environment.apiUrl + '/category/test-id');
    expect(request.request.method).toBe('DELETE');
    request.flush(
      { message: 'No se puede eliminar: está en uso' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(snackBar.open).toHaveBeenLastCalledWith('No se puede eliminar: está en uso', 'Cerrar', {
      duration: 5000,
    });
    fixture.componentInstance.confirmDelete('test-id', 'Prueba');
    http.expectOne(environment.apiUrl + '/category/test-id').flush(null);
    expect(snackBar.open).toHaveBeenLastCalledWith('Categoría eliminada', 'Cerrar', {
      duration: 3000,
    });
  });
});
