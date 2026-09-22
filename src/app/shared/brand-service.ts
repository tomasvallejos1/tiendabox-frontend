import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { Brand, BrandPayload, BrandUpdate } from './brand';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly apiUrl = environment.apiUrl;
  readonly brands = signal<Brand[]>([]);

  constructor(private http: HttpClient) {}

  getBrands(): Observable<Brand[]> {
    return this.http
      .get<Brand[]>(`${this.apiUrl}/brands`)
      .pipe(tap((brands) => this.brands.set(brands)));
  }

  getBrand(id: string): Observable<Brand> {
    return this.http.get<Brand>(`${this.apiUrl}/brand/${id}`);
  }

  createBrand(payload: BrandPayload): Observable<Brand> {
    return this.http.post<Brand>(`${this.apiUrl}/brand`, payload);
  }

  updateBrand(id: string, changes: BrandUpdate): Observable<Brand> {
    return this.http.put<Brand>(`${this.apiUrl}/brand/${id}`, changes);
  }

  deleteBrand(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/brand/${id}`);
  }

  getName(id: string): string {
    return this.brands().find((b) => b.id === id)?.name ?? 'Sin marca';
  }
}
