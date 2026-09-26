import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

import { OrderStatusBadge } from './order-status-badge';

// Wrapper necesario porque el input es required.
@Component({
  selector: 'app-test-host',
  imports: [OrderStatusBadge],
  template: '<app-order-status-badge [status]="status" />',
})
class TestHost {
  status: 'pendiente' | 'confirmado' = 'pendiente';
}

describe('OrderStatusBadge', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
