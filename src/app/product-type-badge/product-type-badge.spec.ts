import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductTypeBadge } from './product-type-badge';

describe('ProductTypeBadge', () => {
  let fixture: ComponentFixture<ProductTypeBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductTypeBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductTypeBadge);
  });

  async function render(type: string | null): Promise<HTMLElement> {
    fixture.componentRef.setInput('type', type);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show "En stock" for stock products', async () => {
    const el = await render('stock');
    expect(el.querySelector('mat-chip')?.textContent).toContain('En stock');
  });

  it('should show "Por encargo" for encargo products', async () => {
    const el = await render('encargo');
    expect(el.querySelector('mat-chip')?.textContent).toContain('Por encargo');
  });

  it('should render nothing for null or unknown types', async () => {
    expect((await render(null)).querySelector('mat-chip')).toBeNull();
    expect((await render('otro')).querySelector('mat-chip')).toBeNull();
  });
});
