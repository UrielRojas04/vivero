package com.vivero.gestion.models;

public enum TipoMovimientoStock {
    INGRESO,
    EGRESO,
    VENTA,
    MERMA,
    AJUSTE_INICIAL,
    DEVOLUCION_SOBRANTE,
    // Change entregas-pendientes-confirmacion-vivero, Decisión 1 de design.md: agregados AL
    // FINAL, sin reordenar los existentes. ENTREGA_PENDIENTE descuenta stock al registrar una
    // entrega pendiente de confirmación (Vivero-only); REVERSA_ENTREGA_PENDIENTE repone ese
    // stock si el dueño la rechaza. Ninguno de los dos entra en la lista de referencia de costo
    // de egresos futuros (MovimientoStockServiceImpl: sólo INGRESO/AJUSTE_INICIAL) ni crea
    // CapaCostoStock -- se comportan como un egreso más para efectos de costeo.
    ENTREGA_PENDIENTE,
    REVERSA_ENTREGA_PENDIENTE
}
