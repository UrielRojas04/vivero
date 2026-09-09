package com.vivero.gestion.dto;

import java.math.BigDecimal;

/**
 * Ganancia disponible acumulada de cada cuenta operativa de Abono (change retiro-ganancia-abono,
 * Decisión 7 de design.md). Expone tanto el teórico como lo ya retirado, no sólo el resultado
 * final, para que la pantalla pueda mostrar el desglose sin una segunda llamada.
 */
public class GananciaDisponibleAbonoDTO {
    private BigDecimal gananciaTeoricaAcumuladaJefe;
    private BigDecimal gananciaTeoricaAcumuladaColega;
    private BigDecimal retirosAcumuladosJefe;
    private BigDecimal retirosAcumuladosColega;
    private BigDecimal gananciaDisponibleJefe;
    private BigDecimal gananciaDisponibleColega;

    public GananciaDisponibleAbonoDTO() {}

    public BigDecimal getGananciaTeoricaAcumuladaJefe() { return gananciaTeoricaAcumuladaJefe; }
    public void setGananciaTeoricaAcumuladaJefe(BigDecimal gananciaTeoricaAcumuladaJefe) { this.gananciaTeoricaAcumuladaJefe = gananciaTeoricaAcumuladaJefe; }

    public BigDecimal getGananciaTeoricaAcumuladaColega() { return gananciaTeoricaAcumuladaColega; }
    public void setGananciaTeoricaAcumuladaColega(BigDecimal gananciaTeoricaAcumuladaColega) { this.gananciaTeoricaAcumuladaColega = gananciaTeoricaAcumuladaColega; }

    public BigDecimal getRetirosAcumuladosJefe() { return retirosAcumuladosJefe; }
    public void setRetirosAcumuladosJefe(BigDecimal retirosAcumuladosJefe) { this.retirosAcumuladosJefe = retirosAcumuladosJefe; }

    public BigDecimal getRetirosAcumuladosColega() { return retirosAcumuladosColega; }
    public void setRetirosAcumuladosColega(BigDecimal retirosAcumuladosColega) { this.retirosAcumuladosColega = retirosAcumuladosColega; }

    public BigDecimal getGananciaDisponibleJefe() { return gananciaDisponibleJefe; }
    public void setGananciaDisponibleJefe(BigDecimal gananciaDisponibleJefe) { this.gananciaDisponibleJefe = gananciaDisponibleJefe; }

    public BigDecimal getGananciaDisponibleColega() { return gananciaDisponibleColega; }
    public void setGananciaDisponibleColega(BigDecimal gananciaDisponibleColega) { this.gananciaDisponibleColega = gananciaDisponibleColega; }
}
