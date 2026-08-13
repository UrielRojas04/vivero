## 1. Widget de Conversión (Frontend)

- [x] 1.1 Crear el componente `ConversorBandejas.jsx` en `frontend/src/components/` con estado interno para cantidad (número), modo (semillas/bandejas) y tipoBandeja.
- [x] 1.2 Implementar la lógica bidireccional: si cambia la cantidad o el tipo de bandeja, actualizar el resultado instantáneamente. Considerar valores fraccionarios.
- [x] 1.3 Diseñar el UI del widget para que sea "simple y a mano" usando Tailwind CSS (tarjeta pequeña, inputs claros, select de bandeja, y un botón para intercambiar entre calcular semillas o calcular bandejas).
- [x] 1.4 Integrar el componente `ConversorBandejas.jsx` en la página principal de `Siembras.jsx`, por ejemplo en una columna lateral o como un botón desplegable (Popover/Modal).

## 2. Integración en Registro de Siembras (Frontend)

- [x] 2.1 En el modal de Nueva Siembra (`NuevaSiembraModal.jsx` o componente equivalente), identificar el input de "Cantidad inicial (Bandejas)" y el select de "Variedad Bandeja".
- [x] 2.2 Agregar lógica para capturar la cantidad de celdas de la bandeja seleccionada (extraer del objeto de bandeja en el estado global/API).
- [x] 2.3 Mostrar un texto dinámico debajo o al costado del input de cantidad (ej. "Equivale a X semillas") que se actualice en vivo mientras el usuario escribe o cambia el tipo de bandeja.
