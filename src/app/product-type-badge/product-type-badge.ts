import { Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

const TYPE_CONFIG: Record<string, { label: string; cssClass: string }> = {
  stock: { label: 'En stock', cssClass: 'type-stock' },
  encargo: { label: 'Por encargo', cssClass: 'type-encargo' },
};

@Component({
  selector: 'app-product-type-badge',
  imports: [MatChipsModule],
  templateUrl: './product-type-badge.html',
  styleUrl: './product-type-badge.css',
})
export class ProductTypeBadge {
  // string y no ProductType: OrderItem.type llega como string desde la API.
  readonly type = input<string | null | undefined>(null);

  // null si el tipo falta o no es conocido: el template no renderiza nada.
  protected readonly config = computed(() => {
    const type = this.type();
    return type && Object.hasOwn(TYPE_CONFIG, type) ? TYPE_CONFIG[type] : null;
  });
}
