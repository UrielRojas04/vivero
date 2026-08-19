## Why

La devolución de bandejas es una tarea de mostrador: el cliente llega, entrega bandejas vacías y alguien tiene que asentarlo. Hoy esa operación sólo existe como dos botones ("Devolver Bandejas" e "Historial Bandejas") dentro de la página `Clientes.jsx`, que está protegida por el permiso `LEER_CLIENTES`. Ese permiso es todo o nada: quien lo tiene ve también el balance de dinero de cada cliente, su teléfono, la cuenta corriente itemizada y —si además tiene `ESCRIBIR_CLIENTES`— puede crear, editar y eliminar clientes. No existe forma de habilitar únicamente la devolución de bandejas.

La consecuencia práctica es que el rol `EMPLEADO_VIVERO` no tiene hoy ni `LEER_CLIENTES` ni `ESCRIBIR_CLIENTES`, por lo que no puede acceder a `/clientes` y por lo tanto tampoco puede registrar devoluciones de bandejas, que es justamente lo que más necesitaría hacer en el mostrador. La única alternativa disponible para el jefe sería otorgarle `LEER_CLIENTES`, exponiéndole de paso toda la información financiera de los clientes.

A esto se suma un hueco de seguridad real y preexistente: `BandejasController` no tiene ninguna anotación `@PreAuthorize`, ni a nivel de clase ni en sus dos métodos. Las rutas `GET /api/clientes/{id}/bandejas/historial` y `POST /api/clientes/{id}/bandejas/devolucion` están abiertas a **cualquier usuario autenticado**, sin importar su rol ni sus permisos. El control que hoy existe es únicamente visual (el botón no se dibuja si no se llega a la página), y se elude con una llamada HTTP directa.

## What Changes

- Se incorporan dos permisos nuevos y acotados, `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`, que habilitan exclusivamente el circuito de bandejas —consultar el historial y registrar una devolución— sin conceder acceso a ningún otro dato del cliente.
- **Se cierra el hueco de autorización de `BandejasController`.** Ambos endpoints pasan a exigir autorización explícita: el historial requiere `LEER_CLIENTES` o `LEER_BANDEJAS`, y la devolución requiere `ESCRIBIR_CLIENTES` o `ESCRIBIR_BANDEJAS`. Hasta hoy no exigían nada.
- Se agrega un endpoint liviano de listado de clientes para el circuito de bandejas, que devuelve un DTO nuevo con únicamente el identificador, el nombre o razón social y el saldo de bandejas. No expone el balance de dinero ni el teléfono. El endpoint existente `GET /api/clientes` no se reutiliza porque devuelve `ClienteDTO`, que sí incluye `balanceDinero` y `telefono`.
- Se agrega una página nueva en el frontend, dedicada a la devolución de bandejas, con su propio buscador de clientes y su propia ruta protegida, que reutiliza sin modificaciones los modales `DevolucionBandejasModal.jsx` e `HistorialBandejasModal.jsx` ya existentes.
- Se agrega la entrada correspondiente en la navegación lateral y un atajo de asignación por sección en la pantalla de administración de roles, para que el jefe pueda otorgar el acceso con un clic.
- Los permisos nuevos **no se asignan por defecto** a ningún rol distinto de `JEFE`. Habilitar a un empleado es una decisión explícita que el jefe toma desde `UsuariosAdmin.jsx`.
- El circuito actual del jefe **no se modifica**: los botones de `Clientes.jsx` siguen funcionando exactamente igual. Este change es puramente aditivo, agrega una segunda puerta de entrada más angosta.

## Capabilities

### New Capabilities

- `acceso-bandejas`: acceso acotado al circuito de bandejas, independiente del acceso a la ficha de clientes. Cubre los permisos granulares `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`, el listado liviano de clientes que no expone datos financieros, la página y ruta dedicadas a la devolución de bandejas, y la forma en que el jefe otorga ese acceso.

### Modified Capabilities

- `flujo-bandejas`: los requisitos existentes describen el registro de movimientos y la auditoría del historial, pero no dicen nada sobre quién está autorizado a ejecutarlos. Se agrega el requisito de autorización de las operaciones de bandejas, que cierra el hueco actual en el que cualquier usuario autenticado puede consultar el historial y registrar devoluciones de cualquier cliente.

## Impact

**Nivel de gobernanza: MEDIO-ALTO.** El change modifica reglas de autorización y define qué campos ve un rol nuevo. No toca facturación ni secretos, pero sí control de acceso. La implementación debe avanzar con checkpoints: las expresiones `@PreAuthorize` y la lista de campos del DTO nuevo deben ser revisadas por el usuario antes de darse por cerradas, no aprobadas al pasar.

**Backend**

- `backend/src/main/java/com/vivero/gestion/controllers/BandejasController.java`: se agregan las dos anotaciones `@PreAuthorize` faltantes. Es el corazón de seguridad del change.
- `backend/src/main/java/com/vivero/gestion/config/DataInitializer.java`: alta de los dos permisos nuevos y su incorporación al conjunto del rol `JEFE`. El rol `EMPLEADO_VIVERO` no se modifica.
- `backend/src/main/java/com/vivero/gestion/dto/ClienteBandejasDTO.java` (nuevo): proyección mínima de cliente para el circuito de bandejas.
- `backend/src/main/java/com/vivero/gestion/controllers/BandejasClientesController.java` (nuevo): expone el listado liviano bajo `/api/bandejas/clientes`.
- `backend/src/main/java/com/vivero/gestion/services/BandejasService.java` y `.../services/impl/BandejasServiceImpl.java`: método nuevo de listado, respetando el filtro por unidad de negocio que ya aplica `ClienteServiceImpl.getAll()`.

**Frontend**

- `frontend/src/pages/DevolucionBandejas.jsx` (nuevo): página con buscador de clientes y disparo de los dos modales existentes.
- `frontend/src/api/bandejas.api.js` (nuevo): cliente HTTP del endpoint liviano.
- `frontend/src/components/ProtectedRoute.jsx`: hoy `requiredPermission` acepta una sola cadena; debe poder aceptar también una lista con semántica de "alguno de".
- `frontend/src/App.jsx`: ruta nueva protegida.
- `frontend/src/layouts/DashboardLayout.jsx`: entrada nueva de navegación; el filtro de items también debe contemplar la lista de permisos.
- `frontend/src/pages/UsuariosAdmin.jsx`: entrada nueva en el arreglo `SECTIONS`.

**Base de datos**

- Tablas `permisos` y `rol_permisos`. El alta es idempotente: `DataInitializer.crearPermiso()` inserta sólo si el permiso no existe, y el rol `JEFE` se reescribe con el conjunto completo en cada arranque. No hace falta migración manual.

**Sin impacto**

- `frontend/src/pages/Clientes.jsx` no se toca. Los botones "Devolver Bandejas" e "Historial Bandejas" siguen donde están y con el mismo comportamiento.
- La lógica de negocio de bandejas no cambia: ni el cálculo de `balanceBandejas`, ni `CuentaCorrienteBandejas`, ni el registro en `HistorialBandejas`. Este change es sobre acceso y visibilidad, no sobre comportamiento.
- No se retrofitea este patrón a otras pantallas con datos sensibles (Cheques, Finanzas). El alcance es bandejas.
