import { Component, input, linkedSignal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-product-image',
  imports: [MatIconModule],
  templateUrl: './product-image.html',
  styleUrl: './product-image.css',
  host: {
    '[class.thumbnail]': 'size() === "small"',
    '[class.large]': 'size() === "large"',
  },
})
export class ProductImage {
  readonly url = input<string | null>(null);
  readonly name = input.required<string>();
  readonly size = input<'small' | 'medium' | 'large'>('medium');

  protected readonly failed = linkedSignal({
    source: () => this.url(),
    computation: () => false,
  });

  protected onError(): void {
    this.failed.set(true);
  }
}
