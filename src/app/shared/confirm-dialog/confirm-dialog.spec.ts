import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  it('shows the message and returns a boolean for each choice', async () => {
    const close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Eliminar producto',
            message: '¿Eliminar Prueba?',
            confirmText: 'Eliminar',
            isDestructive: true,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmDialog);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('¿Eliminar Prueba?');
    fixture.nativeElement.querySelector('button[mat-button]').click();
    expect(close).toHaveBeenLastCalledWith(false);
    fixture.nativeElement.querySelector('button[mat-flat-button]').click();
    expect(close).toHaveBeenLastCalledWith(true);
    expect(fixture.nativeElement.querySelector('.destructive')).not.toBeNull();
  });
});
