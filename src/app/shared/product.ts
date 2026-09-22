export type ProductType = 'stock' | 'encargo';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  type: ProductType;
  price: number | null;
  stock: number;
  category_id: string;
  brand_id: string;
  is_active: boolean;
}

export interface ProductWithNames extends Product {
  category_name: string;
  brand_name: string;
}

// Tipos derivados: payload de creación y de edición.
export type ProductPayload = Omit<Product, 'id' | 'is_active'>;
export type ProductUpdate = Partial<ProductPayload>;
