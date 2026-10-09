export type TaxStatus = 'consumidor_final' | 'responsable_inscripto' | 'monotributo' | 'exento';

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
