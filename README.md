# tiendabox-frontend

Frontend de la app tiendabox para la materia desarrollo de software.

Aplicación Angular 21 (standalone, Angular Material 3) que consume la API REST de TiendaBox.
**Antes de escribir código leé [CONVENTIONS.md](CONVENTIONS.md).**

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

## Tests

```bash
npm test                  # ng test (Vitest, modo watch)
npx ng test --watch=false # una sola corrida
```

## Formato

```bash
npx prettier --write src
```
