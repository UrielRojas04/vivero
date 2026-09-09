package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import lombok.Data;

/**
 * Body de POST /{id}/confirmar (Decisión 13 de design.md). Exige exactamente un precio por cada
 * línea de la entrega -- ni de menos ni de más (validado en el service, no acá).
 */
@Data
public class EntregaPendienteConfirmarRequestDTO {
    private BigDecimal porcentajeDescuento;
    private List<EntregaPendienteConfirmarLineaDTO> lineas = new ArrayList<>();
    private List<PagoRequestDTO> pagos = new ArrayList<>();
}
