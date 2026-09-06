package com.vivero.gestion.dto;

import java.math.BigDecimal;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClienteDTO {
    private Long id;
    private String nombreRazonSocial;
    private String telefono;
    private String dni;
    private String cuil;
    private BigDecimal balanceDinero;
    private Integer balanceBandejas;
}
