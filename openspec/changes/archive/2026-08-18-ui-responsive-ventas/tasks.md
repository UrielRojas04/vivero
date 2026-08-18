## 1. Pantalla Nueva Venta

- [x] 1.1 Revisar `NuevaVenta.jsx`: Configurar el grid principal para que el panel izquierdo (búsqueda) ocupe todo el ancho en mobile (`grid-cols-1 md:grid-cols-[60%_40%]`).
- [x] 1.2 Implementar carrito colapsable/modal en mobile: Ajustar las clases del panel del carrito para que se muestre como un panel inferior o un botón flotante que abre un modal fullscreen en `sm:hidden`.
- [x] 1.3 Asegurar que la búsqueda de clientes y productos ocupe todo el ancho (`w-full`) en resoluciones chicas.

## 2. Modales de Venta (Inputs Numéricos)

- [x] 2.1 Revisar `LiquidacionModal.jsx`: Aplicar `type="number"` y `inputMode="numeric"` a todos los inputs de descuentos, montos en efectivo, montos de transferencia, etc.
- [x] 2.2 Reorganizar métodos de pago en `LiquidacionModal.jsx`: En móviles, asegurar que los métodos de pago (Efectivo, Transferencia, Cheques, Cta Cte) se apilen verticalmente (usar `flex-col sm:flex-row` si están side-by-side, o mantener la grilla que se adapte a 1 columna).
- [x] 2.3 Revisar `SeleccionarClienteModal.jsx`: Garantizar que en mobile sea fullscreen y se pueda scrollear fácilmente. (Nota: No es un modal, ya está integrado en el layout principal responsivo).

## 3. Historial de Ventas

- [x] 3.1 Revisar `HistorialVentas.jsx`: Aplicar el patrón de Card UI para mobile (mismo patrón usado en otras vistas), manteniendo la tabla visible solo en desktop (`hidden sm:block`).
- [x] 3.2 Revisar `VentaComprobanteModal.jsx` (y remito si es distinto): Ajustar el layout del comprobante para que las columnas no colapsen en pantallas chicas (ej: permitir scroll horizontal en la tabla de ítems del comprobante, o apilar info).

## 4. Teclados Numéricos en Resto de Formularios

- [x] 4.1 Modificar `SiembraForm.jsx`: Incorporar `type="number"` e `inputMode="numeric"` en el campo de cantidad.
- [x] 4.2 Modificar `InsumoForm.jsx`: Incorporar `type="number"` e `inputMode="numeric"` en el campo de stock/cantidad.
- [x] 4.3 Modificar `ProductoForm.jsx`: Incorporar `type="number"` e `inputMode="numeric"` en los campos de precio y stock.
- [x] 4.4 Modificar `ClienteForm.jsx`: Incorporar `type="number"` e `inputMode="numeric"` en campos relacionados a dinero o bandejas iniciales si existen.

## 5. Fix descubierto al probar en dispositivo real

- [x] 5.1 `NuevaVenta.jsx`: `crypto.randomUUID()` (usado para las líneas de pago del modal de liquidación) requiere contexto seguro (HTTPS/localhost) y explotaba en blanco al abrir el modal desde el celular por IP de LAN (`http://192.168.x.x`, contexto inseguro). Reemplazado por `generarIdLinea()`, que hace fallback a un ID basado en `Date.now()`/`Math.random()` cuando `crypto.randomUUID` no está disponible.
