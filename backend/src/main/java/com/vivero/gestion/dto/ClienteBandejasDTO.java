package com.vivero.gestion.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

// Versión reducida de ClienteDTO para la pantalla de Devolución de Bandejas: a propósito NO
// incluye balanceDinero ni telefono. Es el motivo entero del change bandejas-acceso-limitado —
// un usuario con sólo LEER_BANDEJAS/ESCRIBIR_BANDEJAS no debe poder ver el saldo en dinero del
// cliente ni sus datos de contacto, sólo lo necesario para devolver bandejas.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClienteBandejasDTO {
    private Long id;
    private String nombreRazonSocial;
    private Integer balanceBandejas;
}
