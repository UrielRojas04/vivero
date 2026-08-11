# Proposal: Rediseño de Pagos Múltiples

## Problema
El flujo actual para cargar pagos múltiples (pagos parciales combinados, ej: efectivo + cheque) resulta muy confuso para el usuario final. El sistema separa la sección de "Ingreso de Pago" de la "Lista de Pagos Ingresados", dependiendo de un botón `+` (que no siempre reacciona visualmente si hay errores) para pasar de un lado a otro. Además, la lógica "mágica" de que el botón Confirmar Venta agrega automáticamente lo que quedó en el input sin apretar `+` genera incertidumbre de si el pago se registró o no.

## Solución
Rediseñar por completo la UI de liquidación de pagos:
1. **Unificar Inputs y Lista:** En lugar de tener una zona de carga y otra de visualización, tendremos una lista dinámica de "Líneas de Pago".
2. **Valor por Defecto:** Al abrir el modal, habrá una única línea de pago pre-cargada con el método "EFECTIVO" y el monto igual al total de la venta (para el 90% de los casos donde se paga todo junto, no hay que hacer clicks extra).
3. **Botón Claro:** Un botón secundario explícito "Añadir pago parcial" debajo de las líneas, que agrega una nueva línea a la lista.
4. **Validación Visual:** Cada línea mostrará sus inputs. Si la suma de las líneas no cubre el total de la venta, el sistema lo indicará como deuda en Cuenta Corriente.
5. **Cero Magia:** El botón "Confirmar Venta" tomará exactamente las líneas de pago visibles, evitando agregar inputs sueltos de manera oculta.

## Impacto
Una experiencia de usuario intuitiva, lineal y explícita (WYSIWYG - What You See Is What You Get), eliminando la confusión del botón `+` y de la gestión de memoria temporal de pagos.
