export interface Category {
  id: string;
  name: string;
  description: string | null;
}

// Tipos derivados: payload de creación y de edición.
export type CategoryPayload = Omit<Category, 'id'>;
export type CategoryUpdate = Partial<CategoryPayload>;
