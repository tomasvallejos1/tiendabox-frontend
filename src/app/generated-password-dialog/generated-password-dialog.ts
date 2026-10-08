import { Component, Inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-generated-password-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './generated-password-dialog.html',
  styleUrl: './generated-password-dialog.css',
})
export class GeneratedPasswordDialog {
  protected readonly copyMessage = signal('');
  constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: { password: string }) {}

  protected async copyPassword(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.data.password);
      this.copyMessage.set('Contraseña copiada');
    } catch {
      this.copyMessage.set('No se pudo copiar. Seleccioná la contraseña y copiala manualmente.');
    }
  }
}
