import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductImage } from './product-image';

describe('ProductImage', () => {
  let fixture: ComponentFixture<ProductImage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProductImage] }).compileComponents();
    fixture = TestBed.createComponent(ProductImage);
    fixture.componentRef.setInput('name', 'Producto de prueba');
  });
  it('renders a loaded image with its name and lazy loading', async () => {
    fixture.componentRef.setInput('url', 'https://example.com/product.jpg');
    await fixture.whenStable();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://example.com/product.jpg');
    expect(img.alt).toBe('Producto de prueba');
    expect(img.getAttribute('loading')).toBe('lazy');
    img.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.placeholder')).toBeNull();
  });
  it.each([null, ''])('uses a placeholder for %s', async (url) => {
    fixture.componentRef.setInput('url', url);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.placeholder').getAttribute('aria-label')).toBe(
      'Producto de prueba',
    );
    expect(fixture.nativeElement.querySelector('mat-icon').textContent.trim()).toBe('image');
  });
  it('falls back on error, then retries when the URL changes', async () => {
    fixture.componentRef.setInput('url', 'https://example.com/broken.jpg');
    await fixture.whenStable();
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.placeholder')).not.toBeNull();
    fixture.componentRef.setInput('url', 'https://example.com/working.jpg');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img')).not.toBeNull();
  });
});
