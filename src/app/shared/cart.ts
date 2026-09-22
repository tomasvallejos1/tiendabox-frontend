import { ProductType } from './product';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  name: string | null; // null si el producto ya no existe
  type: ProductType | null;
  unit_price: number | null; // null si es por encargo o no está disponible
  stock_available: number | null;
  subtotal: number | null; // null si es por encargo o no está disponible
  available: boolean; // false si el producto fue dado de baja
  exceeds_stock: boolean; // la cantidad supera el stock actual
}

export interface Cart {
  id: string;
  customer_id: string;
  updated_at: string;
  items: CartItem[];
  item_count: number; // suma de cantidades
  total: number; // ya calculado por el backend
  has_encargo_items: boolean;
  has_unavailable_items: boolean;
}
