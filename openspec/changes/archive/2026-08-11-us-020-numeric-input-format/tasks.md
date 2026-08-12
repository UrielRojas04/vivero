# Implementation Tasks

## 1. Crear el componente FormattedNumberInput
- [x] 1.1 Crear el archivo `FormattedNumberInput.jsx` en `frontend/src/components/`.
- [x] 1.2 Implementar el estado interno (cadena formateada mostrada al usuario) e inicializarlo con el valor (`value` prop) ya formateado mediante `Intl.NumberFormat('es-AR')`.
- [x] 1.3 Desarrollar el manejador `handleChange` para que extraiga los números crudos del string ingresado, actualice el estado local formateado, y llame al `onChange` original pasándole el número desformateado.
- [x] 1.4 Manejar el caso de input borrado completamente (devolver `0` o cadena vacía/nulo según convenga).

## 2. Actualizar Formularios de Productos
- [x] 2.1 Reemplazar el input de "Precio Unitario" en `ProductoForm.jsx` por `FormattedNumberInput`.
- [x] 2.2 Reemplazar el input de "Stock" si corresponde (opcional según UX, pero útil para cantidades grandes).

## 3. Actualizar UI de Finanzas y Cuentas Corrientes
- [x] 3.1 Reemplazar el input de monto de `nuevoGasto` en `Finanzas.jsx` por `FormattedNumberInput`.
- [x] 3.2 Reemplazar el input de "Monto" en `AjusteSaldoModal.jsx` por `FormattedNumberInput`.

## 4. Testing Manual
- [x] 4.1 Probar la creación de un nuevo gasto, verificando que visualmente agregue puntos, pero se envíe correctamente al backend.
- [x] 4.2 Probar ajustar un saldo de un cliente con montos grandes.
- [x] 4.3 Editar un producto existente para validar la precarga correcta del precio con formato.
