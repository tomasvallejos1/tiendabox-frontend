import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { Category, CategoryPayload, CategoryUpdate } from './category';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly apiUrl = environment.apiUrl;
  readonly categories = signal<Category[]>([]);

  constructor(private http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http
      .get<Category[]>(`${this.apiUrl}/categories`)
      .pipe(tap((cats) => this.categories.set(cats)));
  }

  getCategory(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/category/${id}`);
  }

  createCategory(payload: CategoryPayload): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/category`, payload);
  }

  updateCategory(id: string, changes: CategoryUpdate): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/category/${id}`, changes);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/category/${id}`);
  }

  getName(id: string): string {
    return this.categories().find((c) => c.id === id)?.name ?? 'Sin categoría';
  }
}
