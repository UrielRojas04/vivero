package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class GastoDTO {

    private String id;
    private String concepto;
    private BigDecimal monto;
    private LocalDateTime fecha;
    private String tipo;

    public GastoDTO() {
    }

    public GastoDTO(String id, String concepto, BigDecimal monto, LocalDateTime fecha, String tipo) {
        this.id = id;
        this.concepto = concepto;
        this.monto = monto;
        this.fecha = fecha;
        this.tipo = tipo;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getConcepto() {
        return concepto;
    }

    public void setConcepto(String concepto) {
        this.concepto = concepto;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public void setMonto(BigDecimal monto) {
        this.monto = monto;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }
}
