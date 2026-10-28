import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  const fallback = 'No se pudo completar la operación.';

  it.each([400, 401, 403, 404, 409])('devuelve el texto del backend con status %s', (status) => {
    const err = new HttpErrorResponse({
      status,
      error: { error: 'Ya existe una categoría con ese nombre' },
    });

    expect(apiErrorMessage(err, fallback)).toBe('Ya existe una categoría con ese nombre');
  });

  it.each([
    null,
    'Error del servidor',
    { message: 'Este formato no se usa' },
    {},
    { error: '' },
    { error: '   ' },
    { error: null },
    { error: 123 },
    { error: { detail: 'Error' } },
  ])('devuelve el fallback si el body no contiene un error válido: %j', (error) => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 400, error }), fallback)).toBe(fallback);
  });

  it('conserva el texto original del backend', () => {
    const err = new HttpErrorResponse({ status: 409, error: { error: '  Mensaje del backend  ' } });

    expect(apiErrorMessage(err, fallback)).toBe('  Mensaje del backend  ');
  });

  it('devuelve el mensaje de conexión con status 0', () => {
    const err = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    expect(apiErrorMessage(err, fallback)).toBe(
      'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.',
    );
  });

  it.each([
    null,
    undefined,
    'Error',
    new Error('Error'),
    { status: 400, error: { error: 'Error' } },
  ])('devuelve el fallback si no es un HttpErrorResponse: %j', (err) => {
    expect(apiErrorMessage(err, fallback)).toBe(fallback);
  });
});
