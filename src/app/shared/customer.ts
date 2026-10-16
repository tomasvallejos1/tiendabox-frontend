export type TaxStatus = 'consumidor_final' | 'responsable_inscripto' | 'monotributo' | 'exento';

// Formato valido del documento (government_id) segun la condicion fiscal, con los textos que
// se muestran en el formulario. Es la misma regla que valida el backend: el consumidor final
// suele identificarse con DNI (7 u 8 digitos), aunque tambien puede tener CUIL (11); el resto
// factura con CUIT, que siempre tiene 11. El campo es opcional: vacio siempre es valido.
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
