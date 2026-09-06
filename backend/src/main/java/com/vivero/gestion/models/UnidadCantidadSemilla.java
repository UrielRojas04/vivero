package com.vivero.gestion.models;

/**
 * Unidad en la que el cliente anota la cantidad de semilla que trae. El papel usaba
 * indistintamente gramos, semillas o sobres según lo que dijera el sobre (ver
 * Decisión 4 de openspec/changes/registro-semillas-clientes/design.md).
 */
public enum UnidadCantidadSemilla {
    SEMILLAS,
    SOBRES,
    GRAMOS
}
