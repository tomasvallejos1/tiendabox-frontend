import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatRadioButtonHarness } from '@angular/material/radio/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { CustomerWithEmail } from '../shared/customer';
import { Product } from '../shared/product';
import { AdminOrderForm } from './admin-order-form';

describe('AdminOrderForm', () => {
  let fixture: ComponentFixture<AdminOrderForm>;
  let http: HttpTestingController;
  const customer: CustomerWithEmail = {
    id: 'customer-1',
    user_id: 'user-1',
    name: 'María Pérez',
    email: 'maria@example.com',
    address: 'San Martín 123',
    government_id: null,
    tax_status: 'consumidor_final',
    phone: null,
    created_at: '2026-10-09T12:00:00Z',
  };
  const stock: Product = {
    id: 'stock-1',
    name: 'Caja en stock',
    type: 'stock',
    price: 1200,
    stock: 3,
    description: null,
    image_url: null,
    category_id: 'category-1',
    brand_id: 'brand-1',
    is_active: true,
  };
  // Incluso si el catálogo trae un precio, encargo queda fuera del total.
  const encargo: Product = {
    ...stock,
    id: 'encargo-1',
    name: 'Caja por encargo',
    type: 'encargo',
    price: 5000,
    stock: 0,
  };
  const localCustomer = {
    ...customer,
    id: 'local-1',
    name: 'Juan Local',
    email: null,
    address: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOrderForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AdminOrderForm);
    vi.spyOn(fixture.debugElement.injector.get(MatSnackBar), 'open');
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/customers`).flush([customer, localCustomer]);
    http
      .expectOne(`${environment.apiUrl}/products`)
      .flush([stock, encargo, { ...stock, id: 'inactive', name: 'Inactivo', is_active: false }]);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function selectCustomer(): Promise<void> {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const autocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({ selector: '[formControlName="customer"]' }),
    );
    await autocomplete.clear();
    await autocomplete.enterText('MARIA@');
    const options = await autocomplete.getOptions();
    expect(options).toHaveLength(1);
    expect(await options[0].getText()).toContain('María Pérez');
    expect(await options[0].getText()).toContain('maria@example.com');
    await autocomplete.selectOption({ text: /María Pérez/ });
  }

  async function addProduct(name: string): Promise<void> {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const autocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({ selector: '#product-search' }),
    );
    await autocomplete.enterText(name.toUpperCase());
    await autocomplete.selectOption({ text: new RegExp(name) });
    expect(await autocomplete.getValue()).toBe('');
    await autocomplete.blur();
  }

  function submit(): void {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  function saveButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]');
  }

  it.each(['retiro', 'envio'])(
    'crea un pedido mixto con %s desde los autocompletes y manda cliente e ítems explícitos',
    async (deliveryType) => {
      await selectCustomer();
      await addProduct(stock.name);
      await addProduct(encargo.name);
      const loader = TestbedHarnessEnvironment.loader(fixture);
      await (
        await loader.getHarness(
          MatRadioButtonHarness.with({
            label: deliveryType === 'envio' ? 'Envío a domicilio' : 'Retiro en el local',
          }),
        )
      ).check();
      if (deliveryType === 'envio') {
        const address = await loader.getHarness(
          MatInputHarness.with({
            selector: '[formControlName="delivery_address"]',
          }),
        );
        expect(await address.getValue()).toBe(customer.address);
        await address.setValue('  Dirección editada 456  ');
      } else {
        expect(
          fixture.nativeElement.querySelector('[formControlName="delivery_address"]'),
        ).toBeNull();
      }
      const quantities = await loader.getAllHarnesses(
        MatInputHarness.with({ selector: 'input[type="number"]' }),
      );
      await quantities[0].setValue('2');
      await quantities[1].setValue('5');
      expect(fixture.nativeElement.querySelectorAll('app-product-type-badge')).toHaveLength(2);
      expect(fixture.nativeElement.textContent).toContain('A confirmar');
      expect(fixture.nativeElement.textContent).toContain('El total no los incluye');
      expect(fixture.componentInstance['total']()).toBe(2400);
      submit();
      const request = http.expectOne(`${environment.apiUrl}/order`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        customer_id: customer.id,
        delivery_type: deliveryType,
        ...(deliveryType === 'envio' ? { delivery_address: 'Dirección editada 456' } : {}),
        items: [
          { product_id: stock.id, quantity: 2 },
          { product_id: encargo.id, quantity: 5 },
        ],
      });
      fixture.componentInstance.submit();
      http.expectNone(`${environment.apiUrl}/order`);
      request.flush({ id: 'order-created' });
      await fixture.whenStable();
      expect(fixture.debugElement.injector.get(MatSnackBar).open).toHaveBeenCalledWith(
        'Pedido creado',
        'Cerrar',
        {
          duration: 3000,
        },
      );
      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/admin/pedidos']);
    },
    15000,
  );

  it('exige seleccionar un cliente y al menos un producto', async () => {
    submit();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Seleccioná un cliente de la lista');
    fixture.componentInstance['form'].controls.customer.setValue('María Pérez');
    submit();
    http.expectNone(`${environment.apiUrl}/order`);
    await selectCustomer();
    submit();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Agregá al menos un producto');
    http.expectNone(`${environment.apiUrl}/order`);
  });

  it('actualiza la dirección al cambiar de cliente e invalida la selección al escribir', async () => {
    await selectCustomer();
    const control = fixture.componentInstance['form'].controls.customer;
    control.setValue(localCustomer);
    expect(fixture.componentInstance['form'].controls.delivery_address.value).toBe('');
    expect(control.valid).toBe(true);
    control.setValue('otro nombre');
    expect(control.invalid).toBe(true);
  });

  it('suma un producto repetido en la misma fila y bloquea cantidades por encima del stock', async () => {
    await addProduct(stock.name);
    await addProduct(stock.name);
    expect(fixture.componentInstance['items']()).toHaveLength(1);
    expect(fixture.componentInstance['items']()[0].quantity.value).toBe(2);
    const quantity = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatInputHarness.with({ selector: 'input[type="number"]' }),
    );
    expect(fixture.nativeElement.textContent).toContain('Máximo: 3 unidades');
    await quantity.setValue('4');
    expect(fixture.nativeElement.textContent).toContain('Solo quedan 3 unidades');
    expect(saveButton().disabled).toBe(true);
    await quantity.setValue('3');
    expect(saveButton().disabled).toBe(false);
    expect(fixture.componentInstance['total']()).toBe(3600);
    fixture.nativeElement.querySelector('.item-actions button').click();
    await fixture.whenStable();
    expect(fixture.componentInstance['items']()).toHaveLength(0);
    expect(fixture.componentInstance['total']()).toBe(0);
  });

  it.each(['', '0', '-1', '1.5'])('bloquea una cantidad inválida: %s', async (value) => {
    await addProduct(encargo.name);
    const quantity = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatInputHarness.with({ selector: 'input[type="number"]' }),
    );
    await quantity.setValue(value);
    expect(saveButton().disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('cantidad entera mayor a cero');
    http.expectNone(`${environment.apiUrl}/order`);
  });

  it('exige entrega y dirección sin espacios vacíos solo para envío', async () => {
    await selectCustomer();
    await addProduct(stock.name);
    submit();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Seleccioná un tipo de entrega');
    const form = fixture.componentInstance['form'];
    form.controls.delivery_type.setValue('envio');
    form.controls.delivery_address.setValue('   ');
    submit();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('La dirección es obligatoria');
    http.expectNone(`${environment.apiUrl}/order`);
    form.controls.delivery_type.setValue('retiro');
    expect(form.valid).toBe(true);
  });

  it.each(['message', 'error'])(
    'muestra el error de stock del backend (%s) y permite reintentar sin perder los ítems',
    async (key) => {
      await selectCustomer();
      await addProduct(stock.name);
      fixture.componentInstance['form'].controls.delivery_type.setValue('retiro');
      submit();
      http
        .expectOne(`${environment.apiUrl}/order`)
        .flush(
          { [key]: 'Stock insuficiente para Caja en stock' },
          { status: 400, statusText: 'Bad Request' },
        );
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('Stock insuficiente para Caja en stock');
      expect(saveButton().disabled).toBe(false);
      expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
      submit();
      http.expectOne(`${environment.apiUrl}/order`).flush({ id: 'retry-order' });
    },
  );

  it('excluye productos inactivos y mantiene clientes sin email', async () => {
    expect(fixture.componentInstance['filteredProducts']().map((product) => product.id)).toEqual([
      stock.id,
      encargo.id,
    ]);
    fixture.componentInstance['form'].controls.customer.setValue('juan');
    expect(fixture.componentInstance['filteredCustomers']()).toEqual([localCustomer]);
    expect(fixture.nativeElement.querySelector('a[href="/admin/clientes/new"]')).toBeTruthy();
  });
});
