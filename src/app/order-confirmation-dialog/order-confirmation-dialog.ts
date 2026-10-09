import { Component, Inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { buildQuoteWhatsAppUrl } from '../shared/whatsapp';

export interface OrderConfirmationData {
  orderId: string;
  total: number;
  hasEncargoItems: boolean;
  quoteQuantity: number;
  hasPricedItems: boolean;
}

@Component({
  selector: 'app-order-confirmation-dialog',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './order-confirmation-dialog.html',
  styleUrl: './order-confirmation-dialog.css',
})
export class OrderConfirmationDialog {
  constructor(
    private dialogRef: MatDialogRef<OrderConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) protected readonly data: OrderConfirmationData,
  ) {}

  protected get storeWhatsAppUrl(): string | null {
    return buildQuoteWhatsAppUrl(this.data.orderId);
  }

  protected get shortId(): string {
    return this.data.orderId.substring(0, 8).toUpperCase();
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
