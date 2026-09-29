import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Product, ProductPayload, ProductUpdate, ProductWithNames } from './product';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProducts(filters?: { category_id?: string; brand_id?: string }): Observable<Product[]> {
    let params = new HttpParams();
    if (filters?.category_id) {
      params = params.set('category_id', filters.category_id);
    }
    if (filters?.brand_id) {
      params = params.set('brand_id', filters.brand_id);
    }
    return this.http.get<Product[]>(`${this.apiUrl}/products`, { params });
  }

  getProduct(id: string): Observable<ProductWithNames> {
    return this.http.get<ProductWithNames>(`${this.apiUrl}/product/${id}`);
  }

  createProduct(payload: ProductPayload): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/product`, payload);
  }

  updateProduct(id: string, changes: ProductUpdate): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/product/${id}`, changes);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/product/${id}`);
  }
}
