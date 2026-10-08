import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { OrderConfirmationDialog } from './order-confirmation-dialog';

describe('OrderConfirmationDialog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderConfirmationDialog],
      providers: [
        provideRouter([]),
        { provide: MAT_DIALOG_DATA, useValue: { orderId: 'abc12345', total: 1500, hasEncargoItems: false } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrderConfirmationDialog);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
