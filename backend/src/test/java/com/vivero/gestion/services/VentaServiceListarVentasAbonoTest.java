package com.vivero.gestion.services;

import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Hallazgo #2 de la auditoría de negocio-abono: `VentaServiceImpl.listarVentas()` decidía si
 * filtrar por cuenta con el literal `unidadId == 3L`. Se reemplazó por una resolución dinámica
 * de la unidad "Abono" por nombre. Es una refactorización de igual comportamiento (el id real de
 * Abono en esta base sigue siendo 3), así que el "safety net" de abajo NO es RED/GREEN clásico
 * de una conducta nueva: es la red de regresión exigida por el propio módulo TDD para cambios
 * sobre archivos existentes (paso 0), más el caso concreto que la refactorización naive
 * ("dejar sólo cuentaAbono != null") habría roto: CuentaAbonoContextHolder se completa para
 * CUALQUIER usuario autenticado sin importar la unidad, así que sin el gate por unidad, listar
 * Vivero con un jefe autenticado habría empezado a filtrar (mal) por cuentaAbono también.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class VentaServiceListarVentasAbonoTest {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private Long ventaAbonoJefeId;
    private Long ventaAbonoColegaId;
    private Long ventaViveroId;

    @AfterEach
    void limpiar() {
        UnidadNegocioContextHolder.clear();
        CuentaAbonoContextHolder.clear();
        if (ventaAbonoJefeId != null) ventaRepository.deleteById(ventaAbonoJefeId);
        if (ventaAbonoColegaId != null) ventaRepository.deleteById(ventaAbonoColegaId);
        if (ventaViveroId != null) ventaRepository.deleteById(ventaViveroId);
    }

    private Venta crearVentaMinima(UnidadNegocio unidad, CuentaAbono cuenta) {
        Venta v = new Venta();
        v.setUnidadNegocio(unidad);
        v.setCuentaAbono(cuenta);
        v.setSubtotal(BigDecimal.TEN);
        v.setTotalFinal(BigDecimal.TEN);
        v.setEstadoPago("PAGADO");
        v.setFecha(LocalDateTime.now());
        return ventaRepository.save(v);
    }

    @Test
    void unidadAbonoConCuentaJefeSoloDevuelveVentasDeJefe() {
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Abono sembrada"));

        ventaAbonoJefeId = crearVentaMinima(abono, CuentaAbono.JEFE).getId();
        ventaAbonoColegaId = crearVentaMinima(abono, CuentaAbono.COLEGA).getId();

        UnidadNegocioContextHolder.setUnidadNegocioId(abono.getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);

        List<Long> ids = ventaService.listarVentas().stream().map(VentaResponseDTO::getId).toList();

        assertThat(ids).contains(ventaAbonoJefeId);
        assertThat(ids).doesNotContain(ventaAbonoColegaId);
    }

    @Test
    void unidadViveroNoFiltraPorCuentaAbonoAunConContextoResidual() {
        UnidadNegocio vivero = unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero"));

        // Venta real de Vivero, sin cuenta de abono (como toda venta de Vivero/Herramientas).
        ventaViveroId = crearVentaMinima(vivero, null).getId();

        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        // Contexto de cuenta con valor NO nulo (JEFE), simulando al jefe autenticado navegando
        // Vivero: CuentaAbonoFilter completa este valor para cualquier unidad, no sólo Abono.
        // Si el gate por unidad se hubiera eliminado (dejando sólo `cuentaAbono != null`), esta
        // venta habría quedado filtrada por `findAllByUnidadNegocioIdAndCuentaAbono(vivero, JEFE)`
        // y como su `cuentaAbono` es NULL en la base, la consulta la habría excluido.
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);

        List<Long> ids = ventaService.listarVentas().stream().map(VentaResponseDTO::getId).toList();

        assertThat(ids).contains(ventaViveroId);
    }
}
