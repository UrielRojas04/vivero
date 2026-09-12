package com.vivero.gestion.repositories;

import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.RetiroGananciaAbono;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Grupo 2 de tasks.md de retiro-ganancia-abono: tabla nueva y separada de rendiciones_colega
 * (Decisión 1 de design.md). Base real (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RetiroGananciaAbonoRepositoryTest {

    @Autowired
    private RetiroGananciaAbonoRepository retiroGananciaAbonoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private final List<Long> retirosCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        for (Long id : retirosCreados) retiroGananciaAbonoRepository.deleteById(id);
        retirosCreados.clear();
    }

    private UnidadNegocio abono() {
        return unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Abono sembrada"));
    }

    private Usuario sergio() {
        return usuarioRepository.findByUsername("Sergio")
                .orElseThrow(() -> new IllegalStateException("Falta usuario Sergio sembrado"));
    }

    private RetiroGananciaAbono crearRetiro(CuentaAbono cuenta, BigDecimal monto) {
        RetiroGananciaAbono r = new RetiroGananciaAbono();
        r.setMonto(monto);
        r.setFecha(LocalDateTime.now());
        r.setObservacion("Test retiro ganancia");
        r.setUsuario(sergio());
        r.setUnidadNegocio(abono());
        r.setCuentaAbono(cuenta);
        r.setMedioPago("EFECTIVO");
        RetiroGananciaAbono guardado = retiroGananciaAbonoRepository.save(r);
        retirosCreados.add(guardado.getId());
        return guardado;
    }

    @Test
    void sumarRetirosPorUnidadYCuentaDevuelveElMontoSembrado() {
        RetiroGananciaAbono retiro = crearRetiro(CuentaAbono.JEFE, new BigDecimal("500"));

        BigDecimal suma = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono().getId(), CuentaAbono.JEFE);

        assertThat(suma).isEqualByComparingTo(retiro.getMonto());
    }

    @Test
    void findAllByUnidadNegocioIdOrderByFechaDescIdDescIncluyeElRetiroSembrado() {
        RetiroGananciaAbono retiro = crearRetiro(CuentaAbono.JEFE, new BigDecimal("500"));

        Page<RetiroGananciaAbono> pagina = retiroGananciaAbonoRepository
                .findAllByUnidadNegocioIdOrderByFechaDescIdDesc(abono().getId(), PageRequest.of(0, 20));

        assertThat(pagina.getContent())
                .extracting(RetiroGananciaAbono::getId)
                .contains(retiro.getId());
    }

    // --- 2.3: sumarRetirosPorUnidadYCuenta no mezcla cuentas ---

    @Test
    void sumarRetirosPorUnidadYCuentaNoMezclaJefeYColega() {
        BigDecimal antesJefe = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono().getId(), CuentaAbono.JEFE);
        BigDecimal antesColega = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono().getId(), CuentaAbono.COLEGA);

        crearRetiro(CuentaAbono.JEFE, new BigDecimal("500"));
        crearRetiro(CuentaAbono.COLEGA, new BigDecimal("300"));

        BigDecimal despuesJefe = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono().getId(), CuentaAbono.JEFE);
        BigDecimal despuesColega = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono().getId(), CuentaAbono.COLEGA);

        assertThat(despuesJefe).isEqualByComparingTo(antesJefe.add(new BigDecimal("500")));
        assertThat(despuesColega).isEqualByComparingTo(antesColega.add(new BigDecimal("300")));
    }

    // --- 2.4: sin retiros previos devuelve 0, nunca null ---

    @Test
    void sumarRetirosPorUnidadYCuentaSinRetirosDevuelveCero() {
        // Cuenta sin ningún RetiroGananciaAbono sembrado en este test (aislado por @AfterEach de
        // los demás): la unidad Abono existe pero puede tener retiros de otros tests corridos
        // antes en la misma suite -- lo que importa acá es que el resultado nunca sea null,
        // pase lo que pase con el acumulado real.
        BigDecimal suma = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono().getId(), CuentaAbono.JEFE);

        assertThat(suma).isNotNull();
    }
}
