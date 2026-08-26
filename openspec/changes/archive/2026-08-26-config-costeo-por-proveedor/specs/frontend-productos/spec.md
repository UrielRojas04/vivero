## RENAMED Requirements

- FROM: `### Requirement: Filtrado por Marca en Herramientas`
- TO: `### Requirement: Filtrado por Proveedor en Herramientas`

## MODIFIED Requirements

### Requirement: Filtrado por Proveedor en Herramientas
El sistema MUST permitir al usuario filtrar los productos en la sección de Stock (catálogo) según su **proveedor** cuando se encuentre en la unidad de negocio "Herramientas". El sistema SHALL ofrecer **un único filtro** de este tipo y SHALL NOT ofrecer simultáneamente un filtro por marca.

#### Scenario: Visualización de filtros de proveedor
- **WHEN** el usuario navega a la sección de Stock y selecciona la unidad de negocio "Herramientas" (id 2)
- **THEN** el sistema MUST mostrar opciones (tabs o chips) con todos los proveedores de los productos actuales, junto con una opción "Todos"

#### Scenario: Filtrado activo por proveedor
- **WHEN** el usuario hace click en un proveedor específico (ej. "INGCO")
- **THEN** la grilla de productos se actualiza para mostrar únicamente aquellos productos que tienen ese proveedor exacto

#### Scenario: Producto sin proveedor
- **WHEN** existen productos sin proveedor asignado y el usuario selecciona cualquier proveedor concreto
- **THEN** esos productos no aparecen bajo ningún proveedor, y sí aparecen al seleccionar la opción "Todos"

#### Scenario: No coexisten dos filtros equivalentes
- **WHEN** el usuario navega a la sección de Stock en la unidad de negocio "Herramientas"
- **THEN** el sistema no muestra ningún filtro por marca junto al filtro por proveedor

## ADDED Requirements

### Requirement: Proveedor en el Formulario de Producto
El sistema SHALL permitir seleccionar el proveedor de un producto desde el formulario de producto de la unidad de negocio Herramientas, y SHALL NOT solicitar una marca en esa unidad de negocio.

Al seleccionar un proveedor durante la creación de un producto, el formulario SHALL precargar visiblemente los valores de costeo por defecto de ese proveedor —descuentos, IVA, envío y moneda— dejándolos editables, y SHALL recalcular el desglose de costo y el precio de venta en vivo con esos valores.

El formulario SHALL indicar de forma visible que los valores precargados provienen del proveedor y que pueden modificarse.

#### Scenario: Selección de proveedor precarga los valores
- **WHEN** el usuario crea un producto en Herramientas y selecciona un proveedor con un descuento por defecto del `30%`, IVA incluido en el precio y envío por defecto del `5%`
- **THEN** el formulario muestra ese descuento en la lista de descuentos, el IVA propio en `0` y el envío propio en `5`, y actualiza el desglose de costo y el precio de venta en consecuencia

#### Scenario: El usuario modifica un valor precargado
- **WHEN** el usuario cambia el descuento precargado del `30%` al `35%` antes de guardar
- **THEN** el desglose de costo y el precio de venta se recalculan con el `35%` y el perfil del proveedor no se modifica

#### Scenario: Cambiar de proveedor en la edición de un producto existente
- **WHEN** el usuario edita un producto ya existente y le cambia el proveedor
- **THEN** el sistema no sobrescribe silenciosamente los valores de costeo ya cargados del producto, y ofrece explícitamente traer los valores del proveedor nuevo

#### Scenario: El formulario de Vivero no muestra proveedor
- **WHEN** el usuario abre el formulario de producto con la unidad de negocio Vivero activa
- **THEN** el formulario no muestra ni el selector de proveedor ni los campos de costeo

### Requirement: Moneda del Costo en el Formulario de Producto
El sistema SHALL permitir indicar en el formulario de producto si su costo de catálogo está expresado en pesos o en dólares, únicamente cuando el proveedor seleccionado está configurado como proveedor que cotiza en moneda extranjera.

Cuando el costo está expresado en dólares, el formulario SHALL indicarlo de forma inequívoca en el desglose de costo, para que el importe no se confunda con un importe en pesos.

#### Scenario: Selector de moneda visible sólo cuando corresponde
- **WHEN** el usuario selecciona un proveedor que no cotiza en moneda extranjera
- **THEN** el formulario no muestra ningún selector de moneda y el costo de catálogo se interpreta en pesos

#### Scenario: Costo en dólares señalizado
- **WHEN** el usuario indica que el costo de catálogo `66.24` está expresado en dólares
- **THEN** el desglose de costo del formulario indica explícitamente que ese importe está en dólares

### Requirement: Equivalencia entre Porcentaje y Multiplicador en los Campos de Descuento
El sistema SHALL mostrar, junto a cada campo de porcentaje de descuento del formulario de producto y del formulario de proveedor, la equivalencia como multiplicador del porcentaje ingresado, para permitir el contraste directo con las listas de precios del proveedor.

#### Scenario: Equivalencia visible al tipear
- **WHEN** el usuario ingresa `12.6` en un campo de porcentaje de descuento
- **THEN** el formulario muestra junto al campo la equivalencia `× 0.874`

#### Scenario: Campo de descuento vacío
- **WHEN** el campo de porcentaje de descuento está vacío
- **THEN** el formulario no muestra ninguna equivalencia
