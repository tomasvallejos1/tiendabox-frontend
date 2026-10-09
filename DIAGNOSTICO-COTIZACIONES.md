# Diagnóstico del circuito de cotizaciones

Reproducción del 09/10/2026 en Chrome, a 375 px, con la API local y sin cambiar el frontend previamente.
Se usó un cliente de prueba con perfil completo, retiro y un producto de stock a $1.200.
En los casos con encargo se agregaron dos unidades de un producto sin precio.

| Caso            | Confirmación habilitada | POST /api/order | Total guardado |
| --------------- | ----------------------- | --------------- | -------------- |
| Solo stock      | Sí                      | 201             | 1200           |
| Stock + encargo | Sí                      | 201             | 1200           |
| Solo encargo    | Sí                      | 201             | 0              |

Los tres pedidos se guardaron y abrieron el diálogo de confirmación. No hubo errores HTTP ni
excepciones JavaScript; no hay un stack trace que registrar. No se encontró NaN ni un fallo del
pipe currency. La validación de entrega no depende del total.

Los ítems por encargo llegaron en GET /api/cart con `unit_price: null`, `subtotal: null`,
`stock_available: null`, `available: true` y `exceeds_stock: false`. POST /api/order devolvió
`unit_price: null` para esos ítems, incluso en el pedido de total 0.

## Bloqueo reproducido

Con el perfil recién registrado, antes de completar sus datos, el botón estaba deshabilitado.
El texto exacto, en el resumen del carrito, era:

> Completá tus datos de perfil para poder confirmar

La condición del template era `[disabled]="confirming() || confirmBlocked"`. En cart-page.ts,
`confirmBlocked` devolvía true por `!this.profileComplete()`. No se enviaba POST /api/order y no
existía error de API ni JavaScript. Este bloqueo alcanzaba todos los tipos de carrito y no
demuestra un fallo exclusivo de productos por encargo.

## Problemas de presentación y condiciones generales

El carrito de solo encargo y su confirmación mostraban `$0.00`, y el botón decía
“Confirmar pedido (precio a confirmar)”, sin distinguir claramente una solicitud de cotización.
El seguimiento tampoco ofrecía contacto con la tienda para acordar el precio.

Además, las condiciones de disponibilidad y exceso de stock no comprobaban el tipo de producto.
Con las respuestas actuales de la API esto no bloqueó los ítems por encargo, pero el frontend
debe limitar esas condiciones a stock para respetar la regla de negocio.

La corrección quita el bloqueo por perfil incompleto, mantiene el formulario de perfil disponible
y valida la entrega independientemente. Calcula los importes solo con precios conocidos,
separa cantidades a cotizar y agrega el contacto por WhatsApp. No modifica el backend.

## Verificación después del cambio

Los tres casos volvieron a guardar pedidos con HTTP 201 desde Chrome a 375 px, incluso con
teléfono y CUIT vacíos en el perfil de prueba. Se probó retiro en stock y encargo, y envío en
el mixto, con la dirección precargada. No hubo errores de API, excepciones JavaScript ni
desborde horizontal.

Solo encargo mostró “2 productos a cotizar” y “Enviar pedido de cotización”. La confirmación
omitió el importe de cero y mostró la cantidad, el aviso y el enlace a WhatsApp con el mensaje
del pedido abreviado. El listado mostró “A cotizar” y el detalle mostró “A confirmar” junto al
aviso y al mismo contacto.

`ng build` terminó sin errores; permanece la advertencia existente de tamaño del bundle.
La suite completa pasó: 126 tests. Los pedidos y los datos temporales de prueba fueron
eliminados; no se modificó código del backend.
