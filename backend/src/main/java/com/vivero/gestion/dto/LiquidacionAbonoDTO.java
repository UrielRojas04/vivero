package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class LiquidacionAbonoDTO {
    private BigDecimal ventasJefe;
    private BigDecimal ventasColega;
    private BigDecimal ingresosJefe;
    private BigDecimal ingresosColega;
    private BigDecimal gastosInsumos;
    private BigDecimal rendicionesEntregadas;
    private BigDecimal saldoCajaColega;
    private BigDecimal compensacionTeorica;

    public LiquidacionAbonoDTO() {}

    public BigDecimal getVentasJefe() { return ventasJefe; }
    public void setVentasJefe(BigDecimal ventasJefe) { this.ventasJefe = ventasJefe; }

    public BigDecimal getVentasColega() { return ventasColega; }
    public void setVentasColega(BigDecimal ventasColega) { this.ventasColega = ventasColega; }

    public BigDecimal getIngresosJefe() { return ingresosJefe; }
    public void setIngresosJefe(BigDecimal ingresosJefe) { this.ingresosJefe = ingresosJefe; }

    public BigDecimal getIngresosColega() { return ingresosColega; }
    public void setIngresosColega(BigDecimal ingresosColega) { this.ingresosColega = ingresosColega; }

    public BigDecimal getGastosInsumos() { return gastosInsumos; }
    public void setGastosInsumos(BigDecimal gastosInsumos) { this.gastosInsumos = gastosInsumos; }

    public BigDecimal getRendicionesEntregadas() { return rendicionesEntregadas; }
    public void setRendicionesEntregadas(BigDecimal rendicionesEntregadas) { this.rendicionesEntregadas = rendicionesEntregadas; }

    public BigDecimal getSaldoCajaColega() { return saldoCajaColega; }
    public void setSaldoCajaColega(BigDecimal saldoCajaColega) { this.saldoCajaColega = saldoCajaColega; }

    public BigDecimal getCompensacionTeorica() { return compensacionTeorica; }
    public void setCompensacionTeorica(BigDecimal compensacionTeorica) { this.compensacionTeorica = compensacionTeorica; }
}
