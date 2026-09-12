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
 * Change historial-ventas-compartido-abono: `VentaServiceImpl.listarVentas()` deja de
 * particionar el historial de Abono por `CuentaAbono` — Sergio (JEFE) y Pablo (COLEGA) ven el
 * mismo historial completo, sin importar cuál de las dos cuentas esté activa en el contexto de
 * la petición. El primer test de este archivo afirmaba antes lo contrario (partición por
 * cuenta); se reescribió (nombre incluido) para afirmar el comportamiento nuevo, cubriendo las
 * dos direcciones (JEFE activo y COLEGA activo), igual que hizo `ClienteAgendaCompartidaAbonoTest`
 * con la agenda de clientes.
 *
 * El segundo test (`unidadViveroNoFiltraPorCuentaAbonoAunConContextoResidual`) es una guarda de
 * regresión NO relacionada con este change y no se toca: protege a Vivero de quedar filtrado por
 * `cuentaAbono` cuando hay una cuenta residual en el contexto (`CuentaAbonoContextHolder` se
 * completa para cualquier usuario autenticado, sin importar la unidad que esté consultando). Ese
 * gate por unidad de negocio sigue vigente después de este change: lo único que cambió es que,
 * estando en Abono, ya no se vuelve a filtrar por cuenta.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
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
    void unidadAbonoDevuelveVentasDeAmbasCuentasConCualquieraActiva() {
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Abono sembrada"));

        ventaAbonoJefeId = crearVentaMinima(abono, CuentaAbono.JEFE).getId();
        ventaAbonoColegaId = crearVentaMinima(abono, CuentaAbono.COLEGA).getId();

        UnidadNegocioContextHolder.setUnidadNegocioId(abono.getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);

        List<Long> idsConJefeActivo = ventaService.listarVentas().stream().map(VentaResponseDTO::getId).toList();

        assertThat(idsConJefeActivo).contains(ventaAbonoJefeId, ventaAbonoColegaId);

        // Triangulación (1.2): la dirección inversa también trae las dos ventas — el historial
        // no depende de cuál cuenta esté activa.
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.COLEGA);

        List<Long> idsConColegaActivo = ventaService.listarVentas().stream().map(VentaResponseDTO::getId).toList();

        assertThat(idsConColegaActivo).contains(ventaAbonoJefeId, ventaAbonoColegaId);
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
