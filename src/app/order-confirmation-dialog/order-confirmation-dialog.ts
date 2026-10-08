import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { inject } from '@angular/core';

export interface OrderConfirmationData {
  orderId: string;
  total: number;
  hasEncargoItems: boolean;
}

@Component({
  selector: 'app-order-confirmation-dialog',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './order-confirmation-dialog.html',
  styleUrl: './order-confirmation-dialog.css',
})
export class OrderConfirmationDialog {
  protected readonly data: OrderConfirmationData = inject(MAT_DIALOG_DATA);

  constructor(private dialogRef: MatDialogRef<OrderConfirmationDialog>) {}

  protected get shortId(): string {
    return this.data.orderId.substring(0, 8).toUpperCase();
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
