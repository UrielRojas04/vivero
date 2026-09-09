package com.vivero.gestion.models;

/**
 * Change entregas-pendientes-confirmacion-vivero, Decisión 12 de design.md. Transiciones válidas:
 * PENDIENTE -> CONFIRMADA y PENDIENTE -> RECHAZADA, y nada más. Confirmar o rechazar algo que no
 * está PENDIENTE se rechaza (idempotente-seguro ante doble click / doble tab).
 */
public enum EstadoEntregaPendiente {
    PENDIENTE,
    CONFIRMADA,
    RECHAZADA
}
