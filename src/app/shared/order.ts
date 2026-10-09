export type OrderStatus =
  'pendiente' | 'confirmado' | 'en_preparacion' | 'listo_para_retirar' | 'entregado' | 'cancelado';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  unit_price: number | null;
  quantity: number;
  type: string;
}

export interface OrderCustomer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  government_id: string | null;
  tax_status: string;
}

export interface Order {
  id: string;
  customer_id: string;
  status: OrderStatus;
  delivery_type: string;
  delivery_address: string | null;
  total: number;
  created_at: string;
  items: OrderItem[];
  customer: OrderCustomer | null; // null si el cliente fue eliminado
}

// Payload de creación de un pedido.
export interface CreateOrderPayload {
  customer_id?: string;
  delivery_type: string;
  delivery_address?: string;
  items?: { product_id: string; quantity: number }[];
}
