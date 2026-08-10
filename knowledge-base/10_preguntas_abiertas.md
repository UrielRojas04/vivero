# Preguntas Abiertas e Inconsistencias

Este archivo documenta las dudas pendientes o temas a resolver en futuras iteraciones.

1. **Escalabilidad del PIN de Seguridad:** Al usar un PIN simple de 4-6 dígitos en lugar de contraseñas complejas, existe un riesgo de fuerza bruta si el sistema se expone a internet. ¿Se implementará un límite de reintentos (rate-limiting) en el backend?
2. **Histórico de Unidades de Negocio:** ¿Qué sucede si una Unidad de Negocio (ej. "Perlitas") cierra o deja de operar? ¿Se marca como inactiva (Soft Delete) ocultándola de la UI pero manteniendo su historial financiero intacto?
3. **Migración de Datos Existentes:** El sistema actual ya estaba funcionando parcialmente. ¿Existe la necesidad de importar datos viejos (Ventas, Clientes actuales) al nuevo modelo de datos multi-tenant?
