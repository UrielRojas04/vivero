## Context

En el sistema Vivero, las siembras pueden pertenecer tanto a clientes como al jefe/vivero propio. Actualmente, el input es probablemente un texto o un select sin búsqueda, lo que hace difícil encontrar al dueño a medida que crecen los clientes registrados en la base de datos. Se requiere cambiarlo por un componente de búsqueda (Searchable Select).

## Goals / Non-Goals

**Goals:**
- Implementar un selector con buscador para el campo "dueño" en `SiembraForm.jsx`.
- Integrar la lista de clientes traída desde la API (`/api/clientes`).
- Permitir seleccionar a un cliente o, alternativamente, al jefe/vivero como opción predeterminada o manual.

**Non-Goals:**
- Cambiar el esquema de base de datos de `Siembra` (el campo dueño seguirá guardando el nombre o ID según la implementación actual).
- Crear una tabla nueva de dueños.

## Decisions

- **UI Component**: Se utilizará la librería o el enfoque actual de Tailwind para hacer un custom dropdown (por ejemplo, similar a un Typeahead o simplemente un dropdown nativo mejorado si aplica, o un `<select>` nativo con un wrapper si no hay demasiados clientes, pero la directiva pide caja de búsqueda, así que se hará un dropdown custom interactivo).
- **Data Fetching**: Se usará React Query (`useQuery`) llamando a `clientesApi.getAll()` para obtener los clientes. También se obtendrá o simulará el usuario actual/jefe si se desea tenerlo en la lista.

## Risks / Trade-offs

- **Performance**: Si hay miles de clientes, un dropdown custom podría ralentizarse. *Mitigación*: Se implementará búsqueda local en el front con `.filter()` sobre la lista obtenida, asumiendo un volumen de clientes manejable en el front.
- **Formato del valor enviado**: El backend actualmente espera un string en `dueno`. Si se selecciona un cliente, se enviará el nombre o razón social del cliente.
