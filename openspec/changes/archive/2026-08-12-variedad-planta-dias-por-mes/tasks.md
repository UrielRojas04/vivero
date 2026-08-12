## 1. Backend: Modelo y Base de Datos

- [x] 1.1 Remover el campo `diasCrecimiento` de la entidad `VariedadPlanta`.
- [x] 1.2 Agregar 12 campos Integer a la entidad `VariedadPlanta` correspondientes a los meses: `diasEnero`, `diasFebrero`, ..., `diasDiciembre`.

## 2. Backend: DTOs y Servicios

- [x] 2.1 Actualizar `VariedadPlantaDTO` para soportar la nueva estructura (puede ser a través de un objeto interno `diasPorMes` o campos directos).
- [x] 2.2 Actualizar el mapeo bidireccional en `VariedadPlantaServiceImpl` entre Entity y DTO.
- [x] 2.3 Reiniciar/compilar el backend para que Hibernate actualice el esquema (`ddl-auto=update`).

## 3. Frontend: Componente VariedadPlantaForm

- [x] 3.1 Modificar el estado inicial y schema (si aplica) del formulario para manejar los 12 valores en lugar de uno solo.
- [x] 3.2 Reemplazar el input único por una UI estructurada (ej: grilla 3x4 o 4x3) para ingresar los días de cada mes de forma profesional y clara.
- [x] 3.3 Agregar una acción rápida (botón o ícono) de "Aplicar a todos" para copiar el valor de Enero (o el primer mes editado) al resto de los meses, mejorando la UX.

## 4. Frontend: Listado y Lógica de Siembras

- [x] 4.1 Actualizar la tabla de listado en `VariedadesPlantas.jsx` si mostraba los días (puede mostrar un rango ej: "25-30 días" o "Ver detalle").
- [x] 4.2 Actualizar `SiembraForm.jsx` para que al seleccionar una planta (o cambiar la `fechaSiembra`), se obtenga el mes de esa fecha (1 a 12).
- [x] 4.3 Calcular dinámicamente la `fechaEstimada` sumando los días específicos de ese mes en lugar del valor fijo anterior.
