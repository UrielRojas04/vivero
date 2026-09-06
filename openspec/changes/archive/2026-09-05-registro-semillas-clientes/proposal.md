## Why

Hoy, cuando un cliente lleva un sobre de semillas al invernadero para que el vivero se las germine, el jefe lo anota a mano en una libreta cuadriculada (columnas: Fecha · Lote · Nombre · Semilla · Firma · Stock). Ese papel es el único registro de que el sobre entró: si se pierde, se moja o se llena, no hay forma de reconstruir qué trajo cada cliente, y el cliente se va sin ningún comprobante de que dejó su semilla.

Este change digitaliza ese registro y le agrega lo que el papel no puede dar: un comprobante ("boletita") que el vivero le manda al cliente por WhatsApp como constancia de la entrega.

## What Changes

- **Nueva entidad `RegistroSemilla`** (backend): fecha de recepción, lote impreso en el sobre, quién trajo la semilla, descripción de la semilla, cantidad + unidad, observaciones, y el usuario logueado que recibió (reemplaza la columna "Firma" del papel).
- **Nueva sección "Registro de Semillas"** en el menú lateral, dentro del grupo *Catálogo*, visible sólo en la unidad de negocio **Vivero** (mismo gating que *Siembras*).
- **Alta rápida**: formulario pensado para cargarse parado en el mostrador — fecha precargada en hoy, lote y semilla como texto libre, cantidad numérica con selector de unidad (semillas / sobres / gramos).
- **Vínculo opcional al cliente**: se puede buscar entre los `Cliente` ya cargados (para reutilizar su teléfono en la boletita) o escribir un nombre suelto para quien no es cliente del sistema.
- **Comprobante de recepción ("boletita")**: modal que genera PDF y PNG y permite enviarlo por WhatsApp, replicando el mecanismo ya probado en `ComprobanteVentaModal.jsx` (remito de venta).
- **Extracción de helpers de comprobante compartidos** a `frontend/src/utils/comprobanteExport.js`, consumidos tanto por el comprobante de venta existente como por el nuevo de semillas. Sin cambio de comportamiento en el remito de venta.
- **Listado con búsqueda** por nombre de quien trajo, lote o descripción de la semilla, con edición y borrado lógico.

No se toca: stock, precios, cuenta corriente, facturación, ni el circuito de `Siembra`. El registro de semillas es puramente una constancia de entrada, no genera movimientos de stock ni asientos de dinero.

### Gobernanza

**LOW–MEDIA.** Registra datos de negocio nuevos (entrada de semillas de terceros) pero no toca dinero, no altera stock existente, no toca autenticación ni RBAC (reutiliza permisos ya existentes). El único punto de riesgo MEDIO es la extracción de helpers compartidos de comprobante, porque toca código en producción del remito de venta: se aísla en su propia task con criterio de aceptación de "sin cambio de comportamiento".

## Capabilities

### New Capabilities

- `registro-semillas-clientes`: registro de los sobres de semillas que los clientes entregan en el invernadero (fecha, lote, quién trajo, semilla, cantidad, usuario receptor) y emisión del comprobante de recepción en PDF/PNG con envío por WhatsApp.

### Modified Capabilities

_(ninguna)_ — el change no altera requisitos de specs existentes. Reutiliza los permisos `LEER_SIEMBRAS` / `ESCRIBIR_SIEMBRAS` sin modificar el modelo RBAC, sigue la regla de borrado lógico ya establecida en `data-persistence-soft-delete`, y no cambia el comportamiento de `gestion-siembras` ni de `remitos-pdf`.

## Impact

**Backend** (`backend/src/main/java/com/vivero/gestion/`)
- Nuevos: `models/RegistroSemilla.java`, `models/UnidadCantidadSemilla.java`, `dto/RegistroSemillaDTO.java`, `repositories/RegistroSemillaRepository.java`, `services/RegistroSemillaService.java`, `services/impl/RegistroSemillaServiceImpl.java`, `controllers/RegistroSemillaController.java`.
- Nueva tabla `registros_semillas` (creada por `ddl-auto`, sin migración manual).
- Sin cambios en `PermisoEnum` (se reutilizan `LEER_SIEMBRAS` / `ESCRIBIR_SIEMBRAS`), sin cambios en `DataInitializer`.

**Frontend** (`frontend/src/`)
- Nuevos: `pages/RegistroSemillas.jsx`, `components/RegistroSemillaForm.jsx`, `components/ComprobanteSemillaModal.jsx`, `api/registroSemillas.api.js`, `utils/comprobanteExport.js`.
- Modificados: `App.jsx` (ruta `/registro-semillas`), `layouts/DashboardLayout.jsx` (item de menú en *Catálogo*, `unidades: ['vivero']`), `components/ComprobanteVentaModal.jsx` (pasa a consumir los helpers extraídos).

**Dependencias**: ninguna nueva. `jspdf` y `html-to-image` ya están instalados y en uso.

**Tests**: nuevos tests de servicio en `backend/src/test/java/com/vivero/gestion/services/` sobre base real (sin mocks de DB, según la regla dura del proyecto).
