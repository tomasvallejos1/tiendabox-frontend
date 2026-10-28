import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;

  // La API devuelve { error: string }; no usa err.error.message.
  const body: unknown = err.error;
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string' &&
    body.error.trim().length > 0
  ) {
    return body.error;
  }

  if (err.status === 0) {
    return 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
  }

  return fallback;
}
