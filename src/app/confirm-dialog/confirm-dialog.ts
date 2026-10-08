import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  isDestructive: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) protected readonly data: ConfirmDialogData,
    private dialogRef: MatDialogRef<ConfirmDialog, boolean>,
  ) {}

  protected cancel(): void {
    this.dialogRef.close(false);
  }
  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
