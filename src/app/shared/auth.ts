export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  role: string;
  customer_id: string | null;
  token: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: { id: string; email: string; role: string };
  customer: { id: string; name: string };
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  customer_id: string | null;
}
