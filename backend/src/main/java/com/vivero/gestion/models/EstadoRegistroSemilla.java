package com.vivero.gestion.models;

/**
 * Ciclo de vida de disponibilidad de un {@link RegistroSemilla} para vincularse a una
 * {@link Siembra} (change trazabilidad-semillas-siembras, 2026-09-04). SIN_SEMBRAR es el
 * default al crear el registro. SEMBRADAS se pone sola en cuanto el registro se vincula por
 * primera vez a una siembra -- no espera a que esa siembra termine de crecer -- y NO bloquea
 * que se vuelva a vincular a otra siembra (un lote puede repartirse en tandas). CONSUMIDA es
 * la única transición manual (botón "Consumir") y es terminal: un registro CONSUMIDA deja de
 * ofrecerse para vincular en siembras nuevas y no tiene vuelta atrás desde la interfaz.
 */
public enum EstadoRegistroSemilla {
    SIN_SEMBRAR,
    SEMBRADAS,
    CONSUMIDA
}
