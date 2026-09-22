export interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

// Tipos derivados: payload de creación y de edición.
export type BrandPayload = Omit<Brand, 'id'>;
export type BrandUpdate = Partial<BrandPayload>;
