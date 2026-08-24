package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProveedorDTO {
    private Long id;
    private String nombre;
    private String telefono;
    private String contacto;

    // Perfil de costeo por defecto (grupo 3 de tasks.md de config-costeo-por-proveedor).
    // Defaults simétricos a los de la entidad Proveedor: neutro (IVA incluido, sin dólares, sin
    // envío ni descuentos por defecto) para que un proveedor nuevo no aporte nada a ningún
    // producto hasta que se lo configure explícitamente.
    @Builder.Default
    private boolean ivaIncluidoEnPrecio = true;
    private BigDecimal ivaPorDefectoPorcentaje;
    @Builder.Default
    private boolean manejaDolares = false;
    private BigDecimal costoEnvioPorDefectoPorcentaje;
    @Builder.Default
    private List<ProveedorDescuentoDTO> descuentosPorDefecto = new ArrayList<>();

    // Sólo ayuda de tipeo (OQ2, Decisión 5): nunca un default aplicable. Ninguna tarea del grupo
    // 3/4/5 los escribe desde un flujo real; existen sólo como columnas + campo del DTO.
    private BigDecimal ultimaCotizacionConocida;
    private LocalDateTime fechaUltimaCotizacion;
}
