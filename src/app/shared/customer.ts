export type TaxStatus = 'consumidor_final' | 'responsable_inscripto' | 'monotributo' | 'exento';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  government_id: string | null;
  tax_status: string;
  phone: string | null;
  address: string | null;
  created_at: string;
}

// Tipo derivado: payload de edición (el cliente se crea al registrarse).
export type CustomerUpdate = Partial<Omit<Customer, 'id' | 'user_id' | 'created_at'>>;
