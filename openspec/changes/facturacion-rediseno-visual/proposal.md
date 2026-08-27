## Why

La sección **Facturación** es el documento formal que el dueño le presenta al cliente — no es la
cuenta corriente (que registra pagos contra ventas puntuales), sino el resumen prolijo de un período
que se abre y se cierra. Hoy no está a la altura de ese rol y tiene tres problemas medidos contra el
stack real (`localhost:5173`, cliente *Sotomayor*, Playwright + mediciones de DOM):

1. **El listado obliga a scroll horizontal en el celular.** A 390px la tabla de `/facturas` tiene
   `min-w-[600px]` dentro de un contenedor de 356px: el scroller recorta **244px** y el botón
   "Factura Activa" queda **enteramente fuera de pantalla**. La acción principal de la pantalla es
   inalcanzable sin scrollear de costado. El change anterior `facturacion-responsive-mobile`
   resolvió esto agregando `overflow-x-auto` — es decir, **institucionalizó el scroll horizontal**
   en vez de eliminarlo, que es justo lo que el usuario pide corregir ahora.
2. **La factura activa se lee como un tablero, no como una factura.** Son cuatro tarjetas
   independientes con `rounded-xl border shadow-sm` flotando sobre `bg-gray-50` (cabecera, grilla de
   4 indicadores con fondo de color pleno, tabla de artículos, total a pagar). El usuario lo describe
   como "contenedores separados con bordes redondeados como si estuvieran flotando" y pide un
   documento serio, tipo papel — **sin perder ninguna funcionalidad ni ningún color** de los que ya
   tiene.
3. **El historial de facturas cerradas se ve pobre y se abre cortado y descentrado.** Reproducido y
   medido: al expandir una factura del historial, el contenido queda desplazado **66px a la derecha
   en desktop** (34px en mobile) respecto de todo el resto de la página, y **66px más angosto** que
   la misma factura en la pestaña "activa" (958px vs 1022px). En mobile el recorte horizontal de la
   tabla sube de 426px a **460px** y queda anidado dentro de un segundo scroller horizontal. Además
   el contador de la pestaña cuenta facturas que no se renderizan: dice **"Historial (2)"** mientras
   muestra **1** tarjeta.

A eso se suma un dato que el cliente ya tiene cargado y la factura no muestra: el **teléfono**.

## What Changes

- **Listado `/facturas` responsive de verdad**: por debajo de `md` la tabla se oculta y cada cliente
  se presenta como una tarjeta apilada de ancho completo, con la acción "Factura Activa" como botón
  de área táctil amplia. Se elimina el `min-w-[600px]` y el scroll horizontal desaparece. En desktop
  la tabla se conserva tal cual. Es el mismo patrón "tabla en desktop / tarjetas en mobile" ya
  vigente en el listado de Clientes, la cartera de Cheques y el historial de bandejas.
- **Factura activa con aspecto de documento**: los contenedores sueltos se unifican en **un solo
  panel de papel**; los indicadores pasan de tarjeta con fondo de color pleno a **fila de indicadores
  con barra de acento lateral izquierda**; la tabla de artículos pierde su tarjeta propia y queda
  integrada al panel. **Cero cambios funcionales**: Registrar Pago, Agregar Concepto, Descargar,
  Cerrar Factura, Abrir Factura Manualmente y la exportación a imagen se conservan idénticos, y
  ningún color semántico existente se pierde.
- **Teléfono del cliente visible**: se agrega `clienteTelefono` a `FacturaClienteDTO` y se muestra en
  el bloque de datos del cliente del encabezado de la factura y en la tarjeta mobile del listado.
- **Historial rediseñado y centrado**: la tarjeta de resumen de cada factura cerrada gana jerarquía y
  afordancia de expansión, y el detalle expandido pasa a ocupar el **mismo ancho y el mismo eje** que
  la factura activa. Se corrige el contador de la pestaña.

## Capabilities

### New Capabilities

_(ninguna — este change no introduce comportamiento nuevo, redefine la presentación de comportamiento
ya especificado)_

### Modified Capabilities

- `facturacion-cliente`: el requisito de diseño responsivo del detalle de factura se reemplaza — deja
  de admitir "tablas con scroll interno y tarjetas reacomodadas" como solución y pasa a exigir
  presentación de documento único, indicadores con acento lateral, teléfono del cliente visible, y
  detalle del historial alineado al mismo eje y ancho que la factura activa.
- `ui-responsive`: se agrega el listado de Facturación al conjunto de listados tabulares densos que
  colapsan a tarjetas en mobile, con la misma forma que los requisitos ya existentes para el listado
  de Clientes y la cartera de Cheques.

## Impact

- `frontend/src/pages/Facturas.jsx` — listado responsive (tabla desktop + tarjetas mobile).
- `frontend/src/pages/FacturaCliente.jsx` — panel de documento, indicadores con acento, teléfono,
  rediseño del historial y corrección del desplazamiento/recorte y del contador.
- `backend/.../dto/FacturaClienteDTO.java` — campo `clienteTelefono` (sólo transporte de un dato ya
  persistido en `Cliente.telefono`).
- `backend/.../services/impl/FacturaClienteServiceImpl.java` — una línea en el mapeo a DTO. **Sin
  cambios de lógica de negocio, de cálculo de totales ni de endpoints.**
- **Intocable**: `capturarNodoComoImagen` / `esperarProximoFrame` en `FacturaCliente.jsx` — la lógica
  de captura se conserva carácter por carácter; sólo cambia la estructura visual del contenido que
  captura.
- **Fuera de alcance**: ventas, pagos, cuenta corriente, cheques y cualquier otro módulo.
