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
    private BigDecimal porcentajeRepartoColega;
    // Sólo se completan en obtenerLiquidacionAcumulada() (bug real corregido 2026-09-08, reportado
    // por el dueño: "saldo en caja" no bajaba al hacer un retiro de ganancia -- ver el comentario
    // en RendicionColegaServiceImpl.obtenerLiquidacionAcumulada()). En obtenerLiquidacion(desde,
    // hasta), que sigue siendo mensual, quedan en cero: los retiros de ganancia son un total
    // histórico sin fecha de corte, mezclarlos en un recorte mensual arbitrario sería incorrecto.
    private BigDecimal retirosAcumuladosJefe;
    private BigDecimal retirosAcumuladosColega;

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

    public BigDecimal getPorcentajeRepartoColega() { return porcentajeRepartoColega; }
    public void setPorcentajeRepartoColega(BigDecimal porcentajeRepartoColega) { this.porcentajeRepartoColega = porcentajeRepartoColega; }

    public BigDecimal getRetirosAcumuladosJefe() { return retirosAcumuladosJefe; }
    public void setRetirosAcumuladosJefe(BigDecimal retirosAcumuladosJefe) { this.retirosAcumuladosJefe = retirosAcumuladosJefe; }

    public BigDecimal getRetirosAcumuladosColega() { return retirosAcumuladosColega; }
    public void setRetirosAcumuladosColega(BigDecimal retirosAcumuladosColega) { this.retirosAcumuladosColega = retirosAcumuladosColega; }
}
