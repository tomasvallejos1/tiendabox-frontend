# Convenciones del proyecto — TiendaBox Front

Este documento define **cómo se escribe código en este repositorio**. Son las convenciones del
repositorio de ejemplo de la cátedra y **se evalúan**: todo commit tiene que respetarlas.
Ante la duda, copiá el patrón de un archivo existente (por ejemplo `src/app/not-found/`).

---

## 1. Stack y versiones

| Pieza             | Versión instalada | Notas                                                   |
| ----------------- | ----------------- | ------------------------------------------------------- |
| Angular (core)    | 21.2.23           | Standalone components, zoneless (default de Angular 21) |
| Angular CLI/build | 21.2.24           | Builder `@angular/build:application`                    |
| Angular Material  | 21.2.14           | Única librería de UI, tema Material 3                   |
| Angular CDK       | 21.2.14           | Para drag & drop, overlays, layout, etc.                |
| Vitest            | 4.1.x             | Runner de tests (default de la CLI 21), entorno `jsdom` |
| TypeScript        | 5.9.x             |                                                         |
| Prettier          | 3.x               | Configurado en `.prettierrc`                            |

**Prohibido:** Bootstrap (ni CSS ni JS), Tailwind, PrimeNG u otra librería de UI; NgRx u otra
librería de estado; NgModules.

La API REST (backend `tiendabox`) corre en `http://localhost:3000/api` en desarrollo.

---

## 2. Estructura de carpetas (PLANA)

Cada componente es **una carpeta directamente bajo `src/app/`**. Todo lo que no es componente
(modelos, servicios, guards, interceptor) va en **`src/app/shared/`**.

```text
src/
├── environments/
│   ├── environment.ts            # desarrollo
│   └── environment.prod.ts       # producción (fileReplacements)
├── material-theme.scss           # tema Material 3 con mat.theme()
├── styles.css                    # estilos globales
├── index.html
├── main.ts
└── app/
    ├── app.ts / app.html / app.css / app.spec.ts   # shell (App)
    ├── app.config.ts             # providers globales
    ├── app.routes.ts             # rutas (eager)
    ├── not-found/                # un componente = una carpeta
    │   ├── not-found.ts
    │   ├── not-found.html
    │   ├── not-found.css
    │   └── not-found.spec.ts
    ├── product-list/             # (ejemplo futuro)
    ├── product-detail/           # (ejemplo futuro)
    └── shared/                   # modelos, servicios, guards, interceptor
        ├── product.ts            # modelo
        ├── product-service.ts    # servicio
        ├── auth-guard.ts         # guard
        └── auth-interceptor.ts   # interceptor
```

Reglas:

- ✔ `src/app/product-list/` ✘ `src/app/features/products/product-list/`
- ✔ `src/app/shared/product-service.ts` ✘ `src/app/core/services/product.service.ts`
- **No crear** `core/`, `features/`, `pages/`, `components/`, `models/`, `services/` ni subcarpetas
  dentro de `shared/`. `shared/` es una carpeta plana.
- No anidar componentes: aunque un componente se use solo dentro de otro, su carpeta va igual
  directamente bajo `src/app/`.
- Nombres de carpeta en **kebab-case** e iguales al nombre base de sus archivos.

---

## 3. Nombres de archivos

Los archivos **no llevan sufijo de tipo con punto** (`.component`, `.service`, `.model`, `.guard`…).
Cuando el tipo forma parte del nombre (servicio, guard, interceptor) se une con **guion**.

| Qué              | ✔ Correcto                | ✘ Incorrecto                                              |
| ---------------- | ------------------------- | --------------------------------------------------------- |
| Componente (TS)  | `product-list.ts`         | `product-list.component.ts`                               |
| Template         | `product-list.html`       | `product-list.component.html`                             |
| Estilos          | `product-list.css`        | `product-list.component.css`, `product-list.scss`         |
| Test             | `product-list.spec.ts`    | `product-list.component.spec.ts`                          |
| Servicio         | `product-service.ts`      | `product.service.ts`, `products.service.ts`               |
| Modelo           | `product.ts`              | `product.model.ts`, `product.interface.ts`, `IProduct.ts` |
| Guard            | `auth-guard.ts`           | `auth.guard.ts`                                           |
| Interceptor      | `auth-interceptor.ts`     | `auth.interceptor.ts`                                     |
| Test de servicio | `product-service.spec.ts` | `product.service.spec.ts`                                 |

- Todo en **kebab-case**, en singular para modelos (`product.ts`, `category.ts`, `order-item.ts`).
- Cada componente tiene sus **4 archivos**: `.ts`, `.html`, `.css`, `.spec.ts`. Nada de templates
  ni estilos inline.
- Estilos de componente en **CSS** (no SCSS). El único SCSS del proyecto es `src/material-theme.scss`.

---

## 4. Nombres de clases, selectores y símbolos

| Qué         | Archivo                            | Símbolo exportado                                 | Selector               |
| ----------- | ---------------------------------- | ------------------------------------------------- | ---------------------- |
| Componente  | `product-list/product-list.ts`     | `export class ProductList`                        | `'app-product-list'`   |
| Componente  | `not-found/not-found.ts`           | `export class NotFound`                           | `'app-not-found'`      |
| Componente  | `product-detail/product-detail.ts` | `export class ProductDetail`                      | `'app-product-detail'` |
| Servicio    | `shared/product-service.ts`        | `export class ProductService`                     | —                      |
| Modelo      | `shared/product.ts`                | `export interface Product`                        | —                      |
| Guard       | `shared/auth-guard.ts`             | `export const authGuard: CanActivateFn`           | —                      |
| Interceptor | `shared/auth-interceptor.ts`       | `export const authInterceptor: HttpInterceptorFn` | —                      |

- Clases de componente en PascalCase **sin sufijo `Component`**:
  ✔ `ProductList` ✘ `ProductListComponent`.
- El **selector sí lleva el prefijo `app-`** (configurado como `"prefix": "app"` en `angular.json`).
- Servicios: la clase sí termina en `Service` (sale del nombre del archivo `product-service.ts`).
- Modelos: `interface` en PascalCase singular, **sin prefijo `I`** ni sufijo `Model`:
  ✔ `Product` ✘ `IProduct`, `ProductModel`.
- Guards e interceptores son **funcionales** (constantes en camelCase), no clases.

---

## 5. Componentes standalone

Todos los componentes son standalone (en Angular 21 es el default, **no** se escribe
`standalone: true`). **No existen NgModules** en el proyecto (`@NgModule` prohibido).
Cada componente importa en su array `imports` exactamente lo que usa su template.

```ts
// src/app/product-list/product-list.ts
import { Component, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

import { Product } from '../shared/product';
import { ProductService } from '../shared/product-service';

@Component({
  selector: 'app-product-list',
  imports: [MatCardModule, RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  protected readonly products = signal<Product[]>([]);

  constructor(private productService: ProductService) {}
}
```

---

## 6. Templates: control flow nativo

Usar **`@if` / `@else`, `@for` (con `track`), `@empty` y `@switch`**.
**Nunca** `*ngIf`, `*ngFor`, `*ngSwitch`, ni importar `CommonModule`/`NgIf`/`NgFor` para eso.

```html
<!-- ✔ Correcto -->
@if (loading()) {
<mat-spinner />
} @else { @for (product of products(); track product.id) {
<app-product-card [product]="product" />
} @empty {
<p>No hay productos para mostrar.</p>
} }

<!-- ✘ Incorrecto -->
<div *ngIf="loading">...</div>
<div *ngFor="let p of products">...</div>
```

- Las signals se leen en el template **llamándolas**: `products()`, `loading()`.
- `track` siempre por un identificador estable (`product.id`), no por `$index` salvo listas estáticas.

---

## 7. Estado con signals

- El estado de componentes y servicios se maneja con **`signal()`**, derivados con **`computed()`**
  y se modifica con `.set()` / `.update()`.
- **Sin NgRx** ni otras librerías de estado.
- `HttpClient` devuelve Observables: se suscribe en el componente/servicio y el resultado se
  guarda en una signal.

```ts
protected readonly products = signal<Product[]>([]);
protected readonly loading = signal(false);
protected readonly total = computed(() => this.products().length);

loadProducts(): void {
  this.loading.set(true);
  this.productService.getAll().subscribe({
    next: (products) => this.products.set(products),
    error: () => this.loading.set(false),
    complete: () => this.loading.set(false),
  });
}
```

---

## 8. Inyección de dependencias

**Regla general: inyección por constructor.**

```ts
// ✔ Componentes y servicios
export class ProductList {
  constructor(private productService: ProductService) {}
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}
}
```

**Excepciones — se usa `inject()` únicamente en estos tres casos:**

1. **`FormBuilder`** (como campo de la clase, para poder armar el form en la declaración):

   ```ts
   export class ProductForm {
     private fb = inject(FormBuilder);

     protected readonly form = this.fb.group({
       name: ['', Validators.required],
       price: [0, [Validators.required, Validators.min(0)]],
     });

     constructor(private productService: ProductService) {}
   }
   ```

2. **Guards** (funcionales, no tienen constructor):

   ```ts
   // src/app/shared/auth-guard.ts
   export const authGuard: CanActivateFn = () => {
     const authService = inject(AuthService);
     const router = inject(Router);
     return authService.isLoggedIn() ? true : router.createUrlTree(['/login']);
   };
   ```

3. **Interceptores** (funcionales, no tienen constructor):

   ```ts
   // src/app/shared/auth-interceptor.ts
   export const authInterceptor: HttpInterceptorFn = (req, next) => {
     const token = inject(AuthService).token();
     return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
   };
   ```

✘ No usar `inject()` en componentes o servicios para nada que no sea `FormBuilder`.

---

## 9. Ruteo

- Todas las rutas se definen en `src/app/app.routes.ts`.
- Rutas **eager** con `component:`. **Nunca** lazy loading con `loadComponent:` ni `loadChildren:`.
- El comodín `'**'` (`NotFound`) va **siempre último**; las rutas nuevas se agregan antes.
- Las URLs del sitio van en español (`/productos`, `/carrito`, `/pedidos`).

```ts
export const routes: Routes = [
  { path: '', redirectTo: '/productos', pathMatch: 'full' },
  { path: 'productos', component: ProductList }, // ✔
  { path: 'productos/:id', component: ProductDetail }, // ✔
  { path: 'pedidos', component: OrderList, canActivate: [authGuard] },
  // { path: 'carrito', loadComponent: () => import(...) },      // ✘ prohibido
  { path: '**', component: NotFound },
];
```

---

## 10. HTTP, interceptores y environments

- `HttpClient` se provee en `src/app/app.config.ts` con
  `provideHttpClient(withInterceptors([...]))`. Cada interceptor nuevo de `shared/` se agrega a ese array:

  ```ts
  provideHttpClient(withInterceptors([authInterceptor])),
  ```

- La URL base de la API **nunca se hardcodea**: se lee de `environment.apiUrl`.

  ```ts
  import { environment } from '../../environments/environment';

  @Injectable({ providedIn: 'root' })
  export class ProductService {
    private readonly apiUrl = `${environment.apiUrl}/products`;

    constructor(private http: HttpClient) {}

    getAll(): Observable<Product[]> {
      return this.http.get<Product[]>(this.apiUrl);
    }
  }
  ```

- Archivos de entorno:

  | Archivo                                | `production` | `apiUrl`                        |
  | -------------------------------------- | ------------ | ------------------------------- |
  | `src/environments/environment.ts`      | `false`      | `http://localhost:3000/api`     |
  | `src/environments/environment.prod.ts` | `true`       | `https://api.tiendabox.com/api` |

- En `angular.json` (`build > configurations > production > fileReplacements`) el build de
  producción reemplaza `environment.ts` por `environment.prod.ts`.
  **Siempre importar `environment`, nunca `environment.prod`.**
- Si se agrega una clave nueva, agregarla en **los dos** archivos.

---

## 11. UI: Angular Material 3 + CDK

- **Única librería de UI: Angular Material + CDK.** Nada de Bootstrap ni clases utilitarias de otras
  librerías.
- Se importan los módulos/componentes de Material que usa cada componente, en su `imports`
  (`MatCardModule`, `MatButtonModule`, `MatToolbarModule`, `MatFormFieldModule`, `MatInputModule`,
  `MatTableModule`, `MatSnackBarModule`, …).
- Botones con la API de Material 3: `matButton` (`"text"`, `"filled"`, `"elevated"`, `"outlined"`,
  `"tonal"`), `matIconButton`, `matFab`.

  ```html
  <a matButton="filled" routerLink="/productos">Ir al catálogo</a>
  ```

- Íconos: `<mat-icon>` con la fuente Material Icons (ya cargada en `index.html`).

### Tema

- El tema está en **`src/material-theme.scss`** y se define con **`mat.theme()`**:
  paleta primaria `mat.$magenta-palette` (terciaria `mat.$violet-palette`), tipografía **Roboto**,
  **density 0**, esquema claro.
- En `angular.json > build > options > styles` el orden es **obligatorio**:

  ```json
  "styles": ["src/material-theme.scss", "src/styles.css"]
  ```

- **No cambiar colores con valores fijos.** En los CSS de componentes usar los tokens del sistema
  de Material: `var(--mat-sys-primary)`, `var(--mat-sys-surface)`, `var(--mat-sys-on-surface)`,
  `var(--mat-sys-outline)`, `var(--mat-sys-title-large)`, etc.
- Estilos globales (reset, utilidades de layout) en `src/styles.css`; todo lo demás en el `.css`
  de cada componente.

---

## 12. Shell de la aplicación

`src/app/app.html` contiene el layout base: un contenedor `.app-shell`, el lugar marcado con un
comentario para la futura navbar (`<app-navbar />`, componente `navbar/` con `mat-toolbar`) y el
`<router-outlet />` dentro de `<main class="app-content">`. La clase raíz es `App` (selector
`app-root`).

---

## 13. Formato de código (Prettier)

`.prettierrc`:

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "overrides": [{ "files": "*.html", "options": { "parser": "angular" } }]
}
```

- Comillas simples en TS, 100 columnas máximo, templates formateados con el parser `angular`.
- Antes de cada commit: `npx prettier --write src` (o formatear al guardar en el editor).

---

## 14. Tests (Vitest)

- Runner: **Vitest** vía `ng test` (`npm test`). Para una corrida única: `ng test --watch=false`.
- Cada archivo tiene su spec al lado: `product-list.spec.ts`, `product-service.spec.ts`.
- Componentes con `routerLink`/`router-outlet`: agregar `providers: [provideRouter([])]` en el
  `TestBed`. Servicios con HTTP: `provideHttpClient()` + `provideHttpClientTesting()`.
- Como la app es zoneless, en los tests se espera con `await fixture.whenStable()`.

---

## 15. Generar código con la CLI

Estos comandos de la CLI 21 ya producen los nombres correctos (verificados):

| Comando                                           | Genera                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| `ng g c product-list`                             | `src/app/product-list/product-list.{ts,html,css,spec.ts}` → `ProductList` |
| `ng g s shared/product-service`                   | `src/app/shared/product-service.ts` (+ spec) → `ProductService`           |
| `ng g interface shared/product`                   | `src/app/shared/product.ts` → `interface Product`                         |
| `ng g guard shared/auth --implements CanActivate` | `src/app/shared/auth-guard.ts` (+ spec) → `authGuard`                     |
| `ng g interceptor shared/auth`                    | `src/app/shared/auth-interceptor.ts` (+ spec) → `authInterceptor`         |

✘ No usar `ng g s shared/product` (generaría `product.ts` con `class Product`, que choca con el
modelo) ni rutas como `ng g c features/products/list`.

---

## 16. Comandos del proyecto

| Comando                      | Qué hace                                          |
| ---------------------------- | ------------------------------------------------- |
| `npm start` / `ng serve`     | Servidor de desarrollo en `http://localhost:4200` |
| `npm run build` / `ng build` | Build de producción en `dist/tiendabox-front/`    |
| `npm test` / `ng test`       | Tests con Vitest                                  |

---

## 17. Checklist antes de cada commit

- [ ] Componentes nuevos en `src/app/<nombre>/`, servicios/modelos/guards/interceptores en `src/app/shared/`.
- [ ] Sin `core/` ni `features/`.
- [ ] Archivos sin sufijo de tipo con punto (`product-list.ts`, `product-service.ts`, `product.ts`).
- [ ] Clases de componente sin `Component`; selectores con `app-`.
- [ ] Templates con `@if`/`@for` (nada de `*ngIf`/`*ngFor`).
- [ ] Rutas con `component:` (nada de `loadComponent:`), antes del `'**'`.
- [ ] Estado con `signal()`/`computed()`.
- [ ] Constructor para DI; `inject()` solo en FormBuilder, guards e interceptores.
- [ ] Solo Angular Material/CDK; colores con tokens `--mat-sys-*`.
- [ ] URL de la API desde `environment.apiUrl`.
- [ ] `npx prettier --write src`, `ng build` y `ng test --watch=false` sin errores.
