package com.vivero.gestion.security;

import com.vivero.gestion.models.CuentaAbono;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Hallazgo #1 de la auditoría de negocio-abono: el fallback del filtro no debe atribuir
 * silenciosamente a JEFE cualquier usuario que no sea Pablo. Sólo Sergio y
 * Pablo tienen una cuenta de Abono resuelta; cualquier otro usuario autenticado
 * (ej. un tercer empleado futuro) deja el contexto vacío en vez de heredar la cuenta del jefe.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class CuentaAbonoFilterTest {

    @Autowired
    private CuentaAbonoFilter filter;

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
        CuentaAbonoContextHolder.clear();
    }

    private CuentaAbono ejecutarFiltroComo(String username) throws Exception {
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(username, null, java.util.List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<CuentaAbono> capturado = new AtomicReference<>();

        filter.doFilter(request, response, (req, res) ->
                capturado.set(CuentaAbonoContextHolder.getCuentaAbono()));

        return capturado.get();
    }

    @Test
    void colegaResuelveCuentaColega() throws Exception {
        assertThat(ejecutarFiltroComo("Pablo")).isEqualTo(CuentaAbono.COLEGA);
    }

    @Test
    void jefeResuelveCuentaJefe() throws Exception {
        assertThat(ejecutarFiltroComo("Sergio")).isEqualTo(CuentaAbono.JEFE);
    }

    @Test
    void usuarioDesconocidoNoHeredaJefePorDefecto() throws Exception {
        // Un tercer empleado con login propio, ni jefe ni colega: el contexto debe quedar vacío,
        // NUNCA caer en JEFE por defecto (atribuirle plata al jefe por error es peor que no
        // atribuir nada).
        assertThat(ejecutarFiltroComo("empleado-nuevo@vivero.com")).isNull();
    }

    @Test
    void contextoSeLimpiaDespuesDeCadaPeticion() throws Exception {
        ejecutarFiltroComo("Pablo");
        // Fuera del doFilter (ya en el finally del filtro), el ThreadLocal debe estar vacío.
        assertThat(CuentaAbonoContextHolder.getCuentaAbono()).isNull();
    }
}
