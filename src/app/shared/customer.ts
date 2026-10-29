import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, Validators } from '@angular/forms';

export type TaxStatus = 'consumidor_final' | 'responsable_inscripto' | 'monotributo' | 'exento';

// Formato valido del documento (government_id) segun la condicion fiscal, con los textos que
// se muestran en el formulario. El consumidor final suele identificarse con DNI (7 u 8 digitos),
// aunque tambien puede tener CUIL (11); el resto factura con CUIT, que siempre tiene 11. El
// campo es opcional: vacio siempre es valido.
// Misma regla que customer.service.ts del backend (validateGovernmentId). Si cambia una,
// cambiar la otra.
export interface GovernmentIdRule {
  pattern: RegExp;
  hint: string;
  error: string;
}

export function governmentIdRule(taxStatus: string): GovernmentIdRule {
  if (taxStatus === 'consumidor_final') {
    return {
      pattern: /^(\d{7,8}|\d{11})$/,
      hint: 'DNI o CUIT, sin puntos ni guiones',
      error: 'Debe ser un DNI de 7 u 8 dígitos o un CUIT/CUIL de 11',
    };
  }
  return {
    pattern: /^\d{11}$/,
    hint: 'CUIT de 11 dígitos, sin guiones',
    error: 'El CUIT debe tener 11 dígitos numéricos',
  };
}

// Aplica governmentIdRule al documento y la vuelve a aplicar cada vez que cambia la condicion
// fiscal (tambien con el patchValue de la carga del perfil). onRule recibe la regla vigente.
export function bindGovernmentIdRule(
  form: { controls: { government_id: FormControl<string>; tax_status: FormControl<string> } },
  destroyRef: DestroyRef,
  onRule?: (rule: GovernmentIdRule) => void,
): void {
  const apply = (taxStatus: string) => {
    const rule = governmentIdRule(taxStatus);
    onRule?.(rule);
    const control = form.controls.government_id;
    control.setValidators(Validators.pattern(rule.pattern));
    control.updateValueAndValidity();
  };
  apply(form.controls.tax_status.value);
  form.controls.tax_status.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(apply);
}

export interface Customer {
  id: string;
  user_id: string | null;
  name: string;
  government_id: string | null;
  tax_status: string;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface CustomerWithEmail extends Customer {
  email: string | null;
}

export interface CreateCustomerPayload {
  name: string;
  email?: string;
  password?: string;
  government_id?: string | null;
  tax_status?: string;
  phone?: string | null;
  address?: string | null;
}

export interface CreateCustomerResponse {
  customer: Customer;
  generated_password: string | null;
}

// La edición solo actualiza el perfil comercial.
export type CustomerUpdate = Partial<Omit<Customer, 'id' | 'user_id' | 'created_at'>>;
