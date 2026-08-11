package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class DashboardResumenDTO {

    private BigDecimal totalVentas;
    private BigDecimal totalCostos;
    private BigDecimal gananciaNeta;
    private BigDecimal margen;

    public DashboardResumenDTO() {}

    public BigDecimal getTotalVentas() { return totalVentas; }
    public void setTotalVentas(BigDecimal totalVentas) { this.totalVentas = totalVentas; }
    public BigDecimal getTotalCostos() { return totalCostos; }
    public void setTotalCostos(BigDecimal totalCostos) { this.totalCostos = totalCostos; }
    public BigDecimal getGananciaNeta() { return gananciaNeta; }
    public void setGananciaNeta(BigDecimal gananciaNeta) { this.gananciaNeta = gananciaNeta; }
    public BigDecimal getMargen() { return margen; }
    public void setMargen(BigDecimal margen) { this.margen = margen; }
}