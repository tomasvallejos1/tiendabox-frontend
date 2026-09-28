import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminOrderList } from './admin-order-list';

describe('AdminOrderList', () => {
  let fixture: ComponentFixture<AdminOrderList>;
  let component: AdminOrderList;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOrderList],
      providers: [
        provideRouter([{ path: 'admin/pedidos', component: AdminOrderList }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminOrderList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
