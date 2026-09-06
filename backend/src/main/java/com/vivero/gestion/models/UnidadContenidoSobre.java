package com.vivero.gestion.models;

/**
 * Unidad en la que se expresa RegistroSemilla.contenidoPorSobre cuando unidadCantidad == SOBRES
 * (pedido del dueño 2026-09-05: la hoja de papel real anota indistintamente "1 sobre 10.000
 * semillas c/u" y "3 sobres 10 gr c/u" -- el sobre a veces se define por conteo, a veces por
 * peso). Default SEMILLAS (compatible con todos los registros ya cargados antes de este campo,
 * donde contenidoPorSobre siempre significó semillas por sobre).
 */
public enum UnidadContenidoSobre {
    SEMILLAS,
    GRAMOS
}
