package com.vivero.gestion.repositories.projections;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface GastoUnificadoView {
    String getIdUnico();
    String getConcepto();
    BigDecimal getMonto();
    LocalDateTime getFecha();
    String getTipo();
}
