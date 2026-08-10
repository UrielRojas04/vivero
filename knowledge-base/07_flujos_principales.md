# Flujos Principales (End-to-End)

## Flujo 1: Inicio de Sesión
1. El usuario ingresa a la app e ingresa su `username` y `PIN`.
2. El frontend envía credenciales al endpoint `/api/auth/login`.
3. Backend valida y retorna un JWT. El JWT contiene el `user_id` y las Unidades de Negocio a las que tiene acceso.
4. El frontend guarda el JWT y redirige al dashboard de la unidad por defecto del usuario.

## Flujo 2: Venta y Sincronización en Tiempo Real
1. Un Operario en el invernadero agrega productos al carrito y finaliza la venta.
2. Backend valida stock (RN-01), genera la `Venta`, descuenta stock y guarda el detalle con precios históricos (RN-04).
3. Backend emite un evento SSE: `EVENT: STOCK_UPDATE, PAYLOAD: { producto_id, nuevo_stock }`.
4. El celular del Operario genera el PDF localmente en el browser y da opción a compartirlo.
5. El navegador del Jefe en la oficina recibe el evento SSE, invalida la caché de React Query para ese producto, y el componente hace re-fetch silencioso mostrando el stock actualizado.

## Flujo 3: Devolución de Bandejas
1. El Encargado de Logística busca a un `Cliente` en el sistema.
2. Selecciona "Ingresar Devolución" y pone cantidad (ej: 50).
3. Backend impacta un registro en `HistorialBandejas` (tipo DEVOLUCION).
4. Backend actualiza (resta 50) el `balance_bandejas` en la tabla `CuentaCorrienteBandejas` de ese cliente.
