package com.vivero.gestion.services;

import com.vivero.gestion.dto.RendicionColegaDTO;
import com.vivero.gestion.dto.RendicionRequestDTO;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.repositories.RendicionColegaRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bug real (2026-09-04): "ORDER BY fecha DESC" solo no alcanza para mostrar "más nuevo arriba"
 * cuando varias rendiciones comparten la misma fecha (el selector del formulario sólo tiene
 * precisión de día) -- Postgres resuelve el empate en orden arbitrario. Se desempata por id
 * descendente (ver RendicionColegaRepository.findAllByUnidadNegocioIdOrderByFechaDescIdDesc).
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RendicionColegaOrdenHistorialTest {

    private static final String OBSERVACION_TEST = "Test orden historial rendiciones mismo dia";

    @Autowired
    private RendicionColegaService rendicionService;

    @Autowired
    private RendicionColegaRepository rendicionRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @AfterEach
    void limpiar() {
        unidadNegocioRepository.findByNombre("Abono").ifPresent(abono ->
                rendicionRepository.findAllByUnidadNegocioIdOrderByFechaDescIdDesc(abono.getId(), PageRequest.of(0, 50))
                        .stream()
                        .filter(r -> OBSERVACION_TEST.equals(r.getObservacion()))
                        .forEach(r -> rendicionRepository.deleteById(r.getId())));
        SecurityContextHolder.clearContext();
        CuentaAbonoContextHolder.clear();
    }

    @Test
    void entreRendicionesConLaMismaFechaLaMasRecienCargadaQuedaPrimera() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null,
                        List.of(new SimpleGrantedAuthority("ESCRIBIR_VENTAS"))));
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);

        String hoy = java.time.LocalDate.now().toString();

        for (String monto : List.of("100", "200", "300")) {
            RendicionRequestDTO req = new RendicionRequestDTO();
            req.setMonto(new BigDecimal(monto));
            req.setObservacion(OBSERVACION_TEST);
            req.setMedioPago("EFECTIVO");
            req.setFecha(hoy); // misma fecha (sólo día) para las 3 -> fuerza el empate
            rendicionService.registrarRendicion(req);
        }

        Page<RendicionColegaDTO> historial = rendicionService.obtenerHistorialRendiciones(PageRequest.of(0, 50));
        List<BigDecimal> montosDeEsteTest = historial.getContent().stream()
                .filter(r -> OBSERVACION_TEST.equals(r.getObservacion()))
                .map(RendicionColegaDTO::getMonto)
                .toList();

        // Se cargaron en orden 100, 200, 300 -> la más reciente (300) debe quedar primera.
        assertThat(montosDeEsteTest)
                .containsExactly(new BigDecimal("300.00"), new BigDecimal("200.00"), new BigDecimal("100.00"));
    }
}
