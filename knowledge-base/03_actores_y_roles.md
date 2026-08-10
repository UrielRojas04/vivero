# Actores y Roles (RBAC)

El sistema utiliza un control de acceso basado en roles (RBAC) granular, donde los roles se asignan en el contexto de una **Unidad de Negocio**. Esto significa que un usuario puede ser "Administrador" en el Vivero, pero "Solo Lectura" en Sustratos.

## Actores del Sistema

| Actor | Descripción | Contexto de Negocio |
|-------|-------------|---------------------|
| **Jefe (SuperAdmin)** | Dueño del negocio. Acceso total a finanzas, configuración y usuarios. | Global (Todas las unidades) |
| **Encargado de Logística** | Gestiona envíos, despachos y devoluciones de bandejas. | Específico por Unidad |
| **Operario (Stock)** | Registra movimientos de inventario desde el celular en el invernadero/galpón. | Específico por Unidad |
| **Vendedor** | Registra ventas y genera remitos para los clientes. | Específico por Unidad |
| **Cliente** | Actor pasivo. No ingresa al sistema, pero es el sujeto de deudas de bandejas y receptor de remitos. | N/A |

## Permisos Modulares (Granulares)

Los permisos definen qué acciones exactas se pueden realizar. Los roles son simplemente agrupaciones de estos permisos.

- `FINANZAS_LEER`: Ver precios de costo, márgenes de ganancia y balances.
- `FINANZAS_EDITAR`: Modificar precios de costo e ingresar gastos de insumos.
- `STOCK_LEER`: Ver inventario actual.
- `STOCK_EDITAR`: Descontar o agregar stock.
- `BANDEJAS_EDITAR`: Registrar devolución o entrega de bandejas a clientes.
- `REMITOS_GENERAR`: Crear ventas y generar comprobantes PDF.
- `USUARIOS_ADMIN`: Crear colaboradores y asignarles roles.

## Matriz de Roles y Permisos (Ejemplo)

| Rol (Nombre) | Permisos Incluidos |
|--------------|--------------------|
| **Manager Vivero** | `FINANZAS_LEER`, `STOCK_LEER`, `STOCK_EDITAR`, `BANDEJAS_EDITAR`, `REMITOS_GENERAR` |
| **Peón Invernadero** | `STOCK_LEER`, `STOCK_EDITAR` |
| **Contable** | `FINANZAS_LEER`, `FINANZAS_EDITAR`, `STOCK_LEER` |
