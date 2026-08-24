package com.vivero.gestion.models;

// Moneda en que un proveedor cotiza el costo de un producto (Decisión 5 de design.md de
// config-costeo-por-proveedor — OQ2 resuelta). Es un dato ESTABLE del producto, distinto de la
// cotización específica del dólar, que es volátil y vive en Pedido.cotizacionDolar. ARS es el
// default: un producto existente sin este campo se lee como ARS (grupo 5, tarea 5.1).
public enum MonedaCosto {
    ARS,
    USD
}
