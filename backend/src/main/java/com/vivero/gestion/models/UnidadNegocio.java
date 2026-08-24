package com.vivero.gestion.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "unidades_negocio")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnidadNegocio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;
    private String descripcion;
    
    @Column(precision = 5, scale = 2)
    private java.math.BigDecimal costoEnvioPorcentaje = java.math.BigDecimal.ZERO;

    // Default de IVA de la unidad, simétrico a costoEnvioPorcentaje (Decisión 5 de design.md de
    // costeo-flexible-por-producto). Nace en 0.00 en las dos unidades existentes: con IVA 0 la
    // fórmula nueva es algebraicamente idéntica a la vieja, así que el arranque no cambia ningún
    // costo (Migration Plan, paso 3).
    @Column(name = "iva_porcentaje", precision = 5, scale = 2)
    private java.math.BigDecimal ivaPorcentaje = java.math.BigDecimal.ZERO;

    private boolean activo = true;

    // Flag de capacidad de costeo-fifo-herramientas (Decisión 7 de design.md — el nombre del
    // directorio del change es histórico, el algoritmo NO es FIFO). Nombre EXACTO
    // `costeoPorCapasHabilitado`: el nombre viejo `costeoFifoHabilitado` fue descartado el
    // 2026-08-21 porque el costo de referencia no sale de la capa más vieja, sino del máximo entre
    // las capas activas. Default false: nace en false en las dos unidades existentes (Vivero y
    // Herramientas) y NUNCA se lee por id de unidad — sólo por este flag
    // (`producto.getUnidadNegocio().isCosteoPorCapasHabilitado()`, MovimientoStockServiceImpl,
    // grupo 6). Con el flag en false, MovimientoStockServiceImpl.registrarMovimiento(...) se
    // comporta exactamente igual que antes de este change (Vivero queda intacto por construcción).
    @Column(name = "costeo_por_capas_habilitado", nullable = false, columnDefinition = "boolean default false")
    private boolean costeoPorCapasHabilitado = false;
}
