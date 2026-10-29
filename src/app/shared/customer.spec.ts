import { createEnvironmentInjector, DestroyRef, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it, vi } from 'vitest';
import { bindGovernmentIdRule, governmentIdRule } from './customer';

describe('bindGovernmentIdRule', () => {
  it('aplica la regla de la condición fiscal y la actualiza hasta que se destruye', () => {
    const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    const form = new FormGroup({
      government_id: new FormControl('30123456', { nonNullable: true }),
      tax_status: new FormControl('consumidor_final', { nonNullable: true }),
    });
    const onRule = vi.fn();
    bindGovernmentIdRule(form, injector.get(DestroyRef), onRule);
    const document = form.controls.government_id;
    expect(onRule).toHaveBeenLastCalledWith(governmentIdRule('consumidor_final'));
    expect(document.valid).toBe(true);

    form.controls.tax_status.setValue('monotributo');
    expect(onRule).toHaveBeenLastCalledWith(governmentIdRule('monotributo'));
    expect(document.hasError('pattern')).toBe(true);

    injector.destroy();
    form.controls.tax_status.setValue('consumidor_final');
    expect(onRule).toHaveBeenCalledTimes(2);
    expect(document.hasError('pattern')).toBe(true);
  });
});
