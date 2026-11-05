# tiendabox-frontend

Frontend de la app tiendabox para la materia desarrollo de software.

Aplicación Angular 21 (standalone, Angular Material 3) que consume la API REST de TiendaBox.

## Estructura

`src/app/` tiene una carpeta por recurso: `auth`, `brand`, `cart`, `category`, `customer`,
`layout`, `order` y `product`. Dentro de cada una hay una subcarpeta por componente (por ejemplo
`product/product-form/` con su `.ts`, `.html`, `.css` y `.spec.ts`).

`src/app/shared/` reúne lo que usan varios recursos: los servicios HTTP, los modelos, las funciones
puras (como `apiErrorMessage` o `summarizeOrderItems`), los guards, el interceptor de autenticación y
el diálogo de confirmación (`shared/confirm-dialog/`).

Convenciones del proyecto:

- Inyección de dependencias por constructor en componentes y servicios; la única excepción es
  `FormBuilder`, que se obtiene con `inject()` para poder declarar el formulario como campo. Los
  guards y el interceptor son funciones, así que usan `inject()`.
- Estado del componente en signals (`signal`, `computed`).
- Control de flujo en los templates con `@if` y `@for`, no con `*ngIf` ni `*ngFor`.
- Rutas eager (`component:`, nunca `loadComponent:`).
- Formularios con Reactive Forms y `fb.nonNullable.group(...)`.
- Solo componentes de Angular Material para la interfaz, sin otras librerías de UI.

## Requisitos

- Node.js 24 y npm 11
- La API de TiendaBox corriendo en `http://localhost:3000/api` (ver `src/environments/environment.ts`)

## Instalación

```bash
npm install
```

## Servidor de desarrollo

```bash
npm start   # ng serve
```

Abrir `http://localhost:4200/`. La app se recarga sola al modificar los archivos de `src/`.

## Build

```bash
npm run build   # ng build (producción, usa environment.prod.ts)
```

El resultado queda en `dist/tiendabox-front/`.

### Tamaño del bundle

La convención de la cátedra usa rutas eager (`component:`, nunca `loadComponent:`), así que el
panel de administración viaja en el bundle inicial aunque el cliente nunca lo abra. Por eso el
bundle inicial supera el presupuesto recomendado: en `angular.json` el `maximumError` de
producción está en 1.5MB y el `maximumWarning` sigue en 500kB, para que la advertencia quede
visible. La alternativa sería cargar el panel admin con lazy loading, que la convención no permite.

## Tests

```bash
npm test                  # ng test (Vitest, modo watch)
npx ng test --watch=false # una sola corrida
```

## Reglas de negocio del carrito

Para confirmar un pedido no se exige el perfil completo: exigirlo bloqueaba cualquier carrito de
un cliente recién registrado, aunque la API no necesitaba esos datos. Solo se pide el teléfono
(la tienda coordina retiro, envío y cotizaciones por WhatsApp) y la dirección si la entrega es
por envío; nombre, documento y condición fiscal son opcionales.

## Formato

```bash
npx prettier --write src
```
