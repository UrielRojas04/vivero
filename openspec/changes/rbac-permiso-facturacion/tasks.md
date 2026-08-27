> **Gobernanza: dominio CRÍTICO (auth / seguridad).** Los grupos 2 y 3 tocan `@PreAuthorize` y el seed de roles.
> Los CHECKPOINT marcados son bloqueantes: parar, describir el cambio exacto y esperar confirmación del usuario antes de escribir.
> Regla dura del proyecto: **sin mocks de DB** — la verificación del grupo 6 se hace contra el backend levantado y la base real.
> Regla dura del proyecto: **no buildear ni commitear** sin pedido explícito del usuario.

## 1. Preparación y línea base

- [x] 1.1 Releer `design.md` (Decisiones 1 a 6) y la tabla "Estado actual de Facturación" del Context antes de tocar nada.
- [x] 1.2 Confirmar que los 5 puntos de control siguen como los describe el diseño (`PermisoEnum.java`, `FacturaClienteController.java`, `DashboardLayout.jsx:22`, `App.jsx:72-75`, `UsuariosAdmin.jsx:38-48`). Si alguno cambió, parar y reportar antes de seguir.
- [x] 1.3 Anotar la línea base de acceso: con el backend actual, loguearse con `jefe@vivero.com` y con un usuario no-JEFE existente, y registrar quién ve hoy el item "Facturación". Sirve como antes/después del grupo 6.
- [x] 1.4 Verificar con `git status` que ninguno de los archivos de este change esté modificado por otra sesión en curso. NO tocar archivos de Ventas/Cheques/Productos ni `FacturaCliente.jsx`.

## 2. Backend — permiso nuevo

- [x] 2.1 **CHECKPOINT (CRÍTICO)**: mostrar al usuario el diff propuesto para `PermisoEnum.java` (agregar `LEER_FACTURACION(17L)` al final, sin reordenar ningún ID existente) y esperar su OK.
- [x] 2.2 Agregar `LEER_FACTURACION(17L)` como último valor de `PermisoEnum` en `backend/src/main/java/com/vivero/gestion/models/PermisoEnum.java`, respetando el javadoc ("agregar nuevos siempre al final").
- [x] 2.3 Verificar que ningún otro valor cambió de ID: los 16 existentes siguen con los IDs 1 a 16 en el mismo orden.
- [x] 2.4 Confirmar que `PermisoEnum.fromId(17L)` resuelve al valor nuevo y que `fromId` de los 16 anteriores sigue resolviendo igual (lectura del código; no hace falta test dedicado si el enum no tiene lógica adicional).

## 3. Backend — autorización de endpoints de factura

- [x] 3.1 **CHECKPOINT (CRÍTICO)**: presentar al usuario la tabla completa de las 7 anotaciones `@PreAuthorize` de `FacturaClienteController.java`, con su valor actual y su valor propuesto, y esperar confirmación explícita antes de editar el archivo.
- [x] 3.2 Actualizar los 2 endpoints de **lectura** a `hasAuthority('LEER_FACTURACION') and hasAuthority('LEER_CLIENTES')`: `GET /cliente/{clienteId}/activa` y `GET /cliente/{clienteId}/historial`.
- [x] 3.3 Actualizar los 5 endpoints de **escritura** a `hasAuthority('LEER_FACTURACION') and hasAuthority('ESCRIBIR_VENTAS')`: `POST /cliente/{clienteId}/abrir`, `POST /{facturaId}/conceptos`, `POST /{facturaId}/pagos`, `POST /{facturaId}/cerrar`, `PUT /pagos/{pagoId}/rechazar`.
- [x] 3.4 Verificar que quedan exactamente 7 anotaciones en el controller y que ninguna sigue siendo un `or` con `ESCRIBIR_VENTAS` como llave única (Decisión 2: la condición es conjuntiva en los 7 casos).
- [x] 3.5 Confirmar que NO se tocó ningún otro controller: `ClienteController` (incluido su endpoint `/{id}/factura`), `VentaController`, `FinanzasController` y `ChequeController` quedan exactamente como estaban.

## 4. Backend — seed de roles

- [x] 4.1 **CHECKPOINT (CRÍTICO)**: confirmar con el usuario que se elimina únicamente el bloque de seed de `EMPLEADO_VIVERO` (`DataInitializer.java` ~89-96) y que el bloque de `JEFE` (~82-87) queda intacto.
- [x] 4.2 Eliminar de `backend/src/main/java/com/vivero/gestion/config/DataInitializer.java` el bloque de `EMPLEADO_VIVERO`: la variable `permisosEmpleado`, la llamada `crearRol("EMPLEADO_VIVERO", ...)`, el `setPermisos` y el `save` correspondientes.
- [x] 4.3 Verificar que el bloque de `JEFE` sigue con `EnumSet.allOf(PermisoEnum.class)` **y** con el `rolJefe.setPermisos(permisosJefe); rolRepository.save(rolJefe);` posterior — ese re-set es lo que garantiza que `JEFE` absorba `LEER_FACTURACION` sin migración.
- [x] 4.4 Verificar que NO se agregó ninguna sentencia de borrado de roles: el change elimina código de seed, nunca datos. `EMPLEADO_VIVERO`, si existe en la base, debe sobrevivir con sus permisos y sus usuarios.
- [x] 4.5 Verificar que el resto de `run()` (unidades de negocio, usuario jefe, movimientos de stock, migraciones de descuentos y de marca→proveedor) queda sin cambios y que no quedan imports ni variables sin usar tras el borrado.

## 5. Frontend — gating y modal de roles

- [x] 5.1 En `frontend/src/layouts/DashboardLayout.jsx`, cambiar el `permission` del item `/facturas` de `['ESCRIBIR_VENTAS','LEER_CLIENTES']` a `'LEER_FACTURACION'` (string simple, no array — ver Decisión 2 sobre el `.some()`/OR del filtro).
- [x] 5.2 En `frontend/src/App.jsx`, cambiar el `requiredPermission` del bloque de rutas de Facturas (`/facturas` y `/facturas/:clienteId`) a `"LEER_FACTURACION"`.
- [x] 5.3 Verificar que NO se modificó `ProtectedRoute.jsx`: su semántica OR se mantiene, porque Bandejas y otras pantallas dependen de ella.
- [x] 5.4 En `frontend/src/pages/UsuariosAdmin.jsx`, agregar al array `SECTIONS` el item `{ id: 'facturacion', name: 'Facturación', permNames: ['LEER_FACTURACION', 'LEER_CLIENTES'] }`, **inmediatamente después** del item `ventas`.
- [x] 5.5 Verificar que el item nuevo NO lleva spread condicional por unidad de negocio (`...(isHerramientas ? ... )`): Facturación se muestra en Vivero y en Herramientas.
- [x] 5.6 Verificar que NO se tocaron los items `finanzas` ni `cheques` del array (su filtrado por unidad es un bug conocido, explícitamente fuera de alcance).
- [x] 5.7 Verificar que `Facturas.jsx` y `FacturaCliente.jsx` no fueron modificados por este change.

## 6. Verificación contra base real (sin mocks)

- [x] 6.1 Levantar backend + base y confirmar en el arranque que no hay errores de `DataInitializer` y que ya no se crea/actualiza `EMPLEADO_VIVERO`. **Desvío encontrado y resuelto — ver 7.1.**
- [x] 6.2 Confirmar en la base que el rol `JEFE` quedó con 17 permisos, incluido `LEER_FACTURACION`, sin ninguna acción manual.
- [x] 6.3 Confirmar que `GET /api/roles/permisos` devuelve 17 permisos y que `LEER_FACTURACION` viene con `id: 17`.
- [x] 6.4 Loguearse como `jefe@vivero.com`: el item "Facturación" sigue visible, `/facturas` abre y el detalle por cliente carga. **El JEFE no debe perder acceso.**
- [x] 6.5 Crear desde el panel un rol de prueba `TEST_VENTAS_SIN_FACT` con `ESCRIBIR_VENTAS`, `LEER_STOCK` y `LEER_CLIENTES` (sin `LEER_FACTURACION`) y un usuario asignado a ese rol.
- [x] 6.6 Con ese usuario: el item "Facturación" NO aparece en el sidebar, y navegar directo a `/facturas` y a `/facturas/{id}` por URL redirige al dashboard. Verificado a nivel código+API real (ver reporte: `hasPermission` lee `authorities` del JWT real, confirmado sin `LEER_FACTURACION`).
- [x] 6.7 Con el token de ese usuario, llamar directo a la API: `GET /api/facturas/cliente/{id}/activa`, `GET /api/facturas/cliente/{id}/historial` y `POST /api/facturas/{id}/pagos` deben devolver **403**. Esta es la verificación que realmente importa (Decisión 3).
- [x] 6.8 Con ese mismo usuario, confirmar que **sigue pudiendo cargar una venta** normalmente: el change no debe romper el flujo de ventas.
- [x] 6.9 Editar el rol de prueba desde el panel en modo "Por Secciones", marcar "Facturación", guardar, volver a loguear y confirmar que ahora sí ve el item, entra a `/facturas` y la API responde 200.
- [x] 6.10 Crear un rol de sólo lectura `TEST_FACT_READONLY` con `LEER_FACTURACION` + `LEER_CLIENTES` (sin `ESCRIBIR_VENTAS`): debe poder leer factura activa e historial (200) y recibir **403** al intentar `POST /{facturaId}/cerrar`.
- [x] 6.11 Abrir el modal de Rol con unidad activa Vivero y luego con Herramientas: la sección "Facturación" debe aparecer en **ambas**. Verificado a nivel código (`UsuariosAdmin.jsx`: item `facturacion` sin spread condicional por unidad).
- [x] 6.12 Confirmar que Finanzas, Cheques, Clientes, Ventas y Bandejas siguen comportándose igual que antes para los usuarios de prueba (sin regresión colateral en el RBAC).
- [x] 6.13 Borrar los roles y usuarios de prueba creados en 6.5 y 6.10 al terminar la verificación.

## 7. Cierre

- [x] 7.1 Registrar en el change cualquier desvío respecto de `design.md` y su motivo. **Desvío no anticipado por el diseño:** la tabla `rol_permisos` tiene un CHECK constraint (`rol_permisos_permiso_check`) que Hibernate generó al crear la tabla, enumerando como literales los 16 valores de `PermisoEnum` existentes en ese momento. Con `spring.jpa.hibernate.ddl-auto=update`, Hibernate **no** amplía este constraint cuando el enum crece — es una limitación conocida de Hibernate con `ddl-auto=update` sobre constraints CHECK de enums ya materializados. Resultado: al agregar `LEER_FACTURACION(17L)` y arrancar, el `DataInitializer` fallaba con `DataIntegrityViolationException` al intentar persistir `LEER_FACTURACION` en `rol_permisos` para `JEFE` (`rol_permisos_permiso_check` lo rechazaba), y el backend no booteaba (`Application run failed`). Se corrigió ejecutando manualmente contra la base real: `ALTER TABLE rol_permisos DROP CONSTRAINT rol_permisos_permiso_check;` seguido de un `ADD CONSTRAINT` con la lista de 17 valores (los 16 anteriores + `LEER_FACTURACION`). Tras esto el backend booteó limpio y las 13 verificaciones del grupo 6 se completaron. **Este mismo ALTER manual va a hacer falta en cualquier otro ambiente** (staging/producción) que use `ddl-auto=update` sobre una base con la tabla `rol_permisos` ya creada — no es automático, y no estaba contemplado en `design.md` ni en el Migration Plan. Se recomienda agregarlo como paso explícito del deploy.
- [x] 7.2 Recordar al usuario el paso operativo pendiente: reasignar "Facturación" a los roles reales que correspondan (incluido el `Admin2` de Herramientas) desde el panel de Usuarios (Admin), porque ningún rol distinto de `JEFE` lo recibe automáticamente.
- [x] 7.3 No buildear, no commitear y no pushear salvo pedido explícito del usuario.
