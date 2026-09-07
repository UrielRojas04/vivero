package com.vivero.gestion.security;

import com.vivero.gestion.models.CuentaAbono;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Mapeo único cuenta <-> persona (Decisión 1 de design.md de historial-cobros-abono).
 * Test unitario puro: sin Spring, sin base de datos.
 */
class CuentaAbonoNombresTest {

    @Test
    void nombreVisibleDeJefeEsSergio() {
        assertThat(CuentaAbonoNombres.nombreVisible(CuentaAbono.JEFE)).isEqualTo("Sergio");
    }

    @Test
    void nombreVisibleDeColegaEsPablo() {
        assertThat(CuentaAbonoNombres.nombreVisible(CuentaAbono.COLEGA)).isEqualTo("Pablo");
    }

    @Test
    void nombreVisibleDeCuentaNulaEsSinCuentaAsignada() {
        assertThat(CuentaAbonoNombres.nombreVisible(null)).isEqualTo("Sin cuenta asignada");
    }

    @Test
    void cuentaDeSergioEsJefe() {
        assertThat(CuentaAbonoNombres.cuentaDe("Sergio")).contains(CuentaAbono.JEFE);
    }

    @Test
    void cuentaDePabloEsColega() {
        assertThat(CuentaAbonoNombres.cuentaDe("Pablo")).contains(CuentaAbono.COLEGA);
    }

    @Test
    void cuentaDeUnTercerUsuarioEsVacia() {
        assertThat(CuentaAbonoNombres.cuentaDe("empleado-nuevo@vivero.com")).isEqualTo(Optional.empty());
    }

    @Test
    void cuentaDeUsernameNuloEsVacia() {
        assertThat(CuentaAbonoNombres.cuentaDe(null)).isEqualTo(Optional.empty());
    }
}
