import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Customer,
  CustomerUpdate,
  CustomerWithEmail,
  CreateCustomerPayload,
  CreateCustomerResponse,
} from './customer';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly apiUrl = `${environment.apiUrl}/customer`;

  constructor(private http: HttpClient) {}

  getCustomers(): Observable<CustomerWithEmail[]> {
    return this.http.get<CustomerWithEmail[]>(`${environment.apiUrl}/customers`);
  }

  createCustomer(payload: CreateCustomerPayload): Observable<CreateCustomerResponse> {
    return this.http.post<CreateCustomerResponse>(this.apiUrl, payload);
  }

  deleteCustomer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getCustomer(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/${id}`);
  }

  updateCustomer(id: string, changes: CustomerUpdate): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiUrl}/${id}`, changes);
  }
}
