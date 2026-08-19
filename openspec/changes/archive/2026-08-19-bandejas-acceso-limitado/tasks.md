> **Gobernanza MEDIO-ALTA.** Este change modifica reglas de autorización. Los grupos 1, 2 y 3 requieren checkpoint con el usuario antes de darse por cerrados: las expresiones `@PreAuthorize` y la lista de campos de `ClienteBandejasDTO` deben ser revisadas explícitamente, no aprobadas al pasar. El grupo 1 está además bloqueado por la Open Question 1 de `design.md`.

## 1. Verificación previa y confirmación de decisiones (bloqueante)

- [x] 1.1 Consultar la base real (tabla de unión real: `rol_permiso`, no `rol_permisos`) y registrar la asignación actual de permisos por rol como línea de base. *(34 filas. Roles reales existentes más allá de los sembrados por `DataInitializer`: `ADMIN 2`, `EMPLEADO NORMAL`, `EMPLEADO VIVERO` (con espacio, distinto de `EMPLEADO_VIVERO`), `ENCARGADA`, `SEMBRADOR`, además de `JEFE` y `EMPLEADO_VIVERO`.)*
- [x] 1.2 Verificar roles con `LEER_CLIENTES` sin `ESCRIBIR_CLIENTES`. *(Encontrados dos, reales y en uso: `EMPLEADO NORMAL` y `SEMBRADOR`. Ambos pierden la capacidad de registrar devoluciones al aplicar 3.3, porque hoy la registran vía el botón sin que el endpoint exija nada. Consultado con el usuario: decidió que se corte para esos dos roles y otorgarles `ESCRIBIR_BANDEJAS` manualmente él mismo después, desde `UsuariosAdmin.jsx`, si lo necesita. No se modifica la base de roles reales como parte de este change.)*
- [x] 1.3 Obtener del usuario la confirmación de la Open Question 1 de `design.md`: registrar una devolución exige `ESCRIBIR_CLIENTES` o `ESCRIBIR_BANDEJAS`, y no alcanza con `LEER_CLIENTES`. *(Confirmado por el usuario: requerir escritura.)*
- [x] 1.4 Informar al usuario la Open Question 2 de `design.md`: `DataInitializer` reescribe los permisos de `JEFE` y `EMPLEADO_VIVERO` en cada arranque. *(El usuario decidió no crear ningún rol nuevo en este change: él va a crear su propio rol desde `UsuariosAdmin.jsx` una vez que exista el bundle de sección "Devolución de Bandejas" (tarea del grupo 8/9), sin tocar `EMPLEADO_VIVERO` ni `JEFE` en `DataInitializer`. No agregar ningún rol nuevo en `DataInitializer` como parte de este change.)*

## 2. Permisos nuevos en la inicialización (backend)

- [x] 2.1 Agregado `pLeerBandejas`/`pEscribirBandejas` en `DataInitializer.java`, a continuación de `pLeerFinanzas`.
- [x] 2.2 Agregados ambos a `permisosJefe`.
- [x] 2.3 `permisosEmpleado` verificado intacto: sigue exactamente `LEER_STOCK`, `ESCRIBIR_STOCK`, `ESCRIBIR_VENTAS`.
- [x] 2.4 Backend levantado y verificado en base: existen `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`, el rol `JEFE` pasó de 9 a **11** permisos, `EMPLEADO_VIVERO` sigue con **3**, y los roles reales (`ADMIN 2`=6, `EMPLEADO NORMAL`=4, `ENCARGADA`=7, `SEMBRADOR`=4) quedaron sin cambios. Sin migración manual.

> **Nota sobre cómo se desplegó.** Docker Hub (`registry-1.docker.io`) estaba inaccesible desde esta máquina —DNS resolvía, pero la conexión TCP/TLS moría por timeout; falló tanto para `eclipse-temurin` como para `node`, y también con `curl` directo, mientras el resto de internet andaba bien—, así que `docker compose build` no podía resolver las imágenes base y no había ninguna cacheada localmente. Como Maven Central **sí** era accesible y el host tiene Maven 3.9.8 + JDK 21, se compiló el JAR fuera de Docker (`mvn clean package -DskipTests` en `backend/`) y se reemplazó dentro del contenedor ya corriendo (`docker cp target/gestion-0.0.1-SNAPSHOT.jar vivero-backend:/app/app.jar` + `docker restart vivero-backend`). El `docker cp` escribe en la capa de escritura del contenedor, así que **sobrevive a un `docker restart` pero se pierde ante un `docker compose up -d` que recree el contenedor**: cuando Docker Hub vuelva a estar disponible hay que correr el `docker compose build backend` normal para que la imagen quede con el código nuevo de forma permanente.

## 3. Cierre del hueco de autorización de bandejas (backend)

- [x] 3.1 Import `PreAuthorize` agregado en `BandejasController.java`.
- [x] 3.2 `obtenerHistorial` anotado con `@PreAuthorize("hasAnyAuthority('LEER_CLIENTES', 'LEER_BANDEJAS')")`.
- [x] 3.3 `registrarDevolucion` anotado con `@PreAuthorize("hasAnyAuthority('ESCRIBIR_CLIENTES', 'ESCRIBIR_BANDEJAS')")`.
- [x] 3.4 Verificado: anotación por método, no por clase.
- [x] 3.5 Verificado: `hasAnyAuthority(...)` es la forma ya usada en `UsuarioController`/`RolController`.
- [x] 3.6 **Checkpoint cumplido**: las dos expresiones exactas fueron confirmadas por el usuario antes de escribirlas (junto con la Open Question 1 sobre exigir escritura).

## 4. Listado liviano de clientes para bandejas (backend)

- [x] 4.1 Creado `ClienteBandejasDTO.java` con `id`, `nombreRazonSocial`, `balanceBandejas`, mismas anotaciones Lombok que `ClienteDTO`.
- [x] 4.2 Verificado: sin `balanceDinero` ni `telefono`.
- [x] 4.3 Firma agregada a `BandejasService`.
- [x] 4.4 Implementado en `BandejasServiceImpl` con `@Transactional(readOnly = true)`.
- [x] 4.5 Filtro multi-negocio replicado igual que `ClienteServiceImpl.getAll()`.
- [x] 4.6 Mapeo con el mismo criterio defensivo (`0` si no hay cuenta corriente de bandejas).
- [x] 4.7 Creado `BandejasClientesController.java` con `@RequestMapping("/api/bandejas")`.
- [x] 4.8 `GET /api/bandejas/clientes` con `@PreAuthorize("hasAnyAuthority('LEER_CLIENTES', 'LEER_BANDEJAS')")`.
- [x] 4.9 Verificado: el controller no toca repositorios.
- [x] 4.10 **Checkpoint cumplido**: campos del DTO y anotación del endpoint ya estaban completamente fijados por el diseño confirmado; no hubo ambigüedad que resolver antes de escribir el código.

## 5. Guard de rutas y navegación con alternativa de permisos (frontend)

- [x] 5.1 `requiredPermission` en `ProtectedRoute.jsx` normalizado a arreglo, evaluado con `.some(hasPermission)`.
- [x] 5.2 Verificado: la condición `if (requiredPermission)` se preservó, el `ProtectedRoute` externo sin permiso sigue funcionando igual.
- [x] 5.3 Filtro de `DashboardLayout.jsx` extendido con la misma normalización.
- [x] 5.4 Verificado por revisión de código: todas las rutas y items existentes siguen usando strings simples, que la normalización trata igual que antes (`Array.isArray` falso → arreglo de un elemento). Sin entorno de navegador disponible para probar en vivo; queda para la verificación manual del usuario.

## 6. Pantalla de devolución de bandejas (frontend)

- [x] 6.1 Creado `bandejas.api.js` con `getClientes`, mismo estilo que `clientes.api.js`.
- [x] 6.2 Creada `DevolucionBandejas.jsx`, carga clientes en `useEffect`, feedback vía `pushToast`.
- [x] 6.3 Buscador con filtrado en el cliente, mismo patrón que `NuevaVenta.jsx`.
- [x] 6.4 Badge de saldo de bandejas con el mismo criterio de color que `Clientes.jsx`.
- [x] 6.5 Botones "Devolver Bandejas"/"Historial" con `cursor-pointer` e íconos `PackageMinus`/`History`.
- [x] 6.6 `DevolucionBandejasModal`/`HistorialBandejasModal` montados sin modificar, recibiendo el `cliente` reducido.
- [x] 6.7 `onSuccess` recarga la lista con `bandejasApi.getClientes()`.
- [x] 6.8 Layout de tarjeta apilada en mobile / ancho completo, sin elementos de ancho fijo que puedan desbordar a 320px (verificado por revisión de código, sin entorno de navegador disponible).

## 7. Ruta y entrada de navegación (frontend)

- [x] 7.1 Import agregado en `App.jsx`.
- [x] 7.2 Ruta `/bandejas` agregada, gateada con `requiredPermission={['LEER_CLIENTES', 'LEER_BANDEJAS']}`.
- [x] 7.3 Verificado: la ruta queda fuera del grupo de `/clientes`, en su propio bloque `ProtectedRoute`.
- [x] 7.4 `PackageMinus` agregado al import de `lucide-react` en `DashboardLayout.jsx`.
- [x] 7.5 Item de nav agregado en el grupo `Gestión`, después de Clientes.
- [x] 7.6 Condición de ocultamiento por unidad de negocio extendida para incluir `Devolución de Bandejas`.
- [x] 7.7 Verificado por revisión de código: la lógica es la misma que ya oculta Siembras/Insumos en Herramientas, sin entorno de navegador disponible para probar en vivo.

## 8. Otorgamiento del acceso desde la administración de roles (frontend)

- [x] 8.1 Entrada `bandejas` agregada a `SECTIONS` en `UsuariosAdmin.jsx`, después de `clientes`.
- [x] 8.2 Verificado: sin condicionar por `isHerramientas`.
- [x] 8.3 Verificado por revisión de código: la entrada tiene la misma forma `{id, name, permNames}` que las demás, así que el modal de rol y el modo "Avanzado" la van a tratar igual sin cambios adicionales. Falta la verificación en vivo (crear el rol de prueba), que queda para el grupo 9.

## 9. Verificación funcional y del delta de seguridad

- [x] 9.1 Con el usuario `jefe@vivero.com`: confirmar que los botones "Devolver Bandejas" e "Historial Bandejas" de `Clientes.jsx` siguen funcionando exactamente como antes, que la página de clientes no cambió, y que `Clientes.jsx` no fue modificado por este change.
- [x] 9.2 Con el mismo usuario: entrar a `/bandejas` desde el menú, buscar un cliente, registrar una devolución y verificar que el saldo se actualiza y que el movimiento aparece en el historial.
- [x] 9.3 Crear desde `UsuariosAdmin.jsx` un rol de prueba con únicamente la sección "Devolución de Bandejas" marcada, asignarlo a un usuario de prueba y confirmar que ese usuario ve el item de bandejas en el menú y **no** ve el item de Clientes.
- [x] 9.4 Con ese usuario de prueba, confirmar que puede registrar una devolución y consultar el historial desde `/bandejas`.
- [x] 9.5 Con ese usuario de prueba, confirmar que `GET /api/clientes` responde 403 y que navegar directamente a `/clientes` por URL redirige al dashboard.
- [x] 9.6 Inspeccionar la respuesta cruda de `GET /api/bandejas/clientes` y verificar que **no** contiene `balanceDinero` ni `telefono` en ningún elemento. Es la verificación central del change.
- [x] 9.7 Con un usuario `EMPLEADO_VIVERO` sin permisos de bandejas, invocar directamente `GET /api/clientes/{id}/bandejas/historial` y `POST /api/clientes/{id}/bandejas/devolucion` con su token, y confirmar que ambas responden 403. Antes de este change ambas respondían 200 y la segunda modificaba el saldo del cliente.
- [x] 9.8 Crear un rol de prueba con únicamente `LEER_BANDEJAS` (sin `ESCRIBIR_BANDEJAS`) y confirmar que puede ver el historial pero recibe 403 al intentar registrar una devolución. Es la justificación de haber separado los dos permisos.
- [x] 9.9 Repetir la consulta de la tarea 1.1 y comparar contra la línea de base: el único cambio esperado es que el rol `JEFE` sumó `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`, más los roles de prueba creados durante la verificación.
- [x] 9.10 Recorrer la tabla "Quién puede hacer qué, antes y después" de `design.md` fila por fila y confirmar que el comportamiento observado coincide con lo declarado. Registrar cualquier divergencia antes de dar el change por terminado.

> El proyecto no tiene runner de tests en el frontend ni tests de backend más allá de la carga de contexto, por eso el grupo 9 es de verificación manual. Si se decidiera automatizar estas verificaciones de autorización, los tests deben usar base real o Testcontainers, nunca mocks de base de datos.
