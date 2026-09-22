import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';

import { ProductWithNames } from '../shared/product';
import { ProductService } from '../shared/product-service';
import { AuthService } from '../shared/auth-service';
import { CartService } from '../shared/cart-service';

@Component({
  selector: 'app-product-detail',
  imports: [
    CurrencyPipe,
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  protected readonly product = signal<ProductWithNames | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly notFound = signal(false);
  protected quantity = signal(1);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    protected authService: AuthService,
    protected cartService: CartService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      return;
    }
    this.loading.set(true);
    this.productService.getProduct(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.loadFailed.set(true);
        }
        this.loading.set(false);
      },
    });
  }

  get maxQuantity(): number {
    const p = this.product();
    if (!p) return 1;
    return p.type === 'stock' ? p.stock : 99;
  }

  get canAdd(): boolean {
    const p = this.product();
    if (!p) return false;
    if (p.type === 'stock' && p.stock === 0) return false;
    return true;
  }

  onQuantityChange(value: number): void {
    const clamped = Math.max(1, Math.min(value, this.maxQuantity));
    this.quantity.set(clamped);
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    this.cartService.addItem(p.id, this.quantity()).subscribe({
      next: (cart) => {
        this.cartService.setCart(cart);
        const ref = this.snackBar.open('Producto agregado al carrito', 'Ver carrito', {
          duration: 5000,
        });
        ref.onAction().subscribe(() => this.router.navigate(['/carrito']));
      },
      error: (err: HttpErrorResponse) => {
        const message = err.error?.error ?? 'No se pudo agregar al carrito';
        this.snackBar.open(message, 'Cerrar', { duration: 4000 });
      },
    });
  }
}
