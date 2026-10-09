import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GeneratedPasswordDialog } from './generated-password-dialog';

describe('GeneratedPasswordDialog', () => {
  it('warns about one-time visibility and copies the password', async () => {
    await TestBed.configureTestingModule({
      imports: [GeneratedPasswordDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { password: 'Generada123!' } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(GeneratedPasswordDialog);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('única vez');
    const writeText = vi.fn().mockResolvedValue(undefined);
    const previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      await fixture.componentInstance['copyPassword']();
      expect(writeText).toHaveBeenCalledWith('Generada123!');
      expect(fixture.componentInstance['copyMessage']()).toBe('Contraseña copiada');
      writeText.mockRejectedValue(new Error('denied'));
      await fixture.componentInstance['copyPassword']();
      expect(fixture.componentInstance['copyMessage']()).toContain('manualmente');
    } finally {
      if (previous) Object.defineProperty(navigator, 'clipboard', previous);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });
});
