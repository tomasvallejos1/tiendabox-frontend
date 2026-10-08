import { Component, computed, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { CustomerWithEmail } from '../shared/customer';
import { CustomerService } from '../shared/customer-service';

@Component({
  selector: 'app-admin-customer-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './admin-customer-list.html',
  styleUrl: './admin-customer-list.css',
})
export class AdminCustomerList implements OnInit {
  protected readonly customers = signal<CustomerWithEmail[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly search = signal('');
  protected readonly accountFilter = signal<'all' | 'web' | 'local'>('all');
  protected readonly deletingIds = signal<ReadonlySet<string>>(new Set());
  protected readonly displayedColumns = ['name', 'email', 'phone', 'tax_status', 'actions'];
  protected readonly filteredCustomers = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.customers().filter((customer) => {
      const matchesAccount =
        this.accountFilter() === 'all' ||
        (this.accountFilter() === 'web' ? customer.email !== null : customer.email === null);
      return (
        matchesAccount &&
        [customer.name, customer.email, customer.government_id].some((value) =>
          value?.toLocaleLowerCase().includes(query),
        )
      );
    });
  });

  constructor(
    private customerService: CustomerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  protected loadCustomers(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.customerService
      .getCustomers()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (customers) => this.customers.set(customers),
        error: (err) =>
          this.errorMessage.set(err.error?.message || 'No se pudieron cargar los clientes.'),
      });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.accountFilter.set('all');
  }

  protected taxStatusLabel(value: string): string {
    const labels: Record<string, string> = {
      consumidor_final: 'Consumidor final',
      responsable_inscripto: 'Responsable inscripto',
      monotributo: 'Monotributo',
      exento: 'Exento',
    };
    return labels[value] ?? value;
  }

  protected confirmDelete(customer: CustomerWithEmail): void {
    if (this.deletingIds().has(customer.id)) return;
    this.dialog
      .open(ConfirmDialog, {
        width: '400px',
        data: {
          title: 'Eliminar cliente',
          message: `¿Eliminar al cliente "${customer.name}"?`,
          confirmText: 'Eliminar',
          isDestructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed !== true || this.deletingIds().has(customer.id)) return;
        this.deletingIds.update((ids) => new Set([...ids, customer.id]));
        this.customerService
          .deleteCustomer(customer.id)
          .pipe(
            finalize(() => {
              this.deletingIds.update(
                (ids) => new Set([...ids].filter((id) => id !== customer.id)),
              );
            }),
          )
          .subscribe({
            next: () => {
              this.customers.update((customers) =>
                customers.filter((item) => item.id !== customer.id),
              );
              this.snackBar.open('Cliente eliminado', 'Cerrar', { duration: 3000 });
            },
            error: (err) =>
              this.snackBar.open(
                err.error?.message || 'No se pudo eliminar el cliente.',
                'Cerrar',
                { duration: 5000 },
              ),
          });
      });
  }
}
