package com.vivero.gestion.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnidadNegocioDTO {
    private Long id;
    private String nombre;
    private String descripcion;
    private java.math.BigDecimal costoEnvioPorcentaje;
    // Default de IVA de la unidad (Decisión 5 de design.md de costeo-flexible-por-producto),
    // simétrico a costoEnvioPorcentaje — mismo patrón de persistencia en el service (tarea 8.2).
    private java.math.BigDecimal ivaPorcentaje;
    private boolean activo;
}
