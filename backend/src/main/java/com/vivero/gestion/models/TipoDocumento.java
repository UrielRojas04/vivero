package com.vivero.gestion.models;

// Decisión 2 de design.md de clientes-dni-cuil: lista cerrada de documentos aceptados para el
// documento puntual de una venta casual. Persistido con @Enumerated(EnumType.STRING) en Venta.
public enum TipoDocumento {
    DNI,
    CUIL
}
