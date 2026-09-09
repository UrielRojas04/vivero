package com.vivero.gestion.services;

import com.vivero.gestion.models.CapaCostoStock;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.CapaCostoStockRepository;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Grupo 2 de tasks.md de entregas-pendientes-confirmacion-vivero (Decisión 1 de design.md): dos
 * valores nuevos en TipoMovimientoStock -- ENTREGA_PENDIENTE (descuento al registrar una entrega)
 * y REVERSA_ENTREGA_PENDIENTE (reposición al rechazarla). Ninguno de los dos debe comportarse como
 * un movimiento entrante: no se toman como referencia de costo de egresos futuros
 * (MovimientoStockServiceImpl:140/222, IN [INGRESO, AJUSTE_INICIAL]) ni crean CapaCostoStock
 * (sólo INGRESO/AJUSTE_INICIAL con costeoPorCapasHabilitado). Base real (Postgres localhost:5433),
 * sin mocks de DB, mismo patrón que PrecioAjustadoVentaTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class EntregaPendienteMovimientoStockTest {

    @Autowired
    private MovimientoStockService movimientoStockService;

    @Autowired
    private MovimientoStockRepository movimientoStockRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private CapaCostoStockRepository capaCostoStockRepository;

    private final List<Long> productosCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
    }

    private UnidadNegocio vivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private Usuario jefe() {
        return usuarioRepository.findByUsername("Sergio")
                .orElseThrow(() -> new IllegalStateException("Falta usuario Sergio sembrado"));
    }

    // Devuelve la ENTIDAD ya guardada (no sólo el id): pasarla directo a registrarMovimiento evita
    // un findById() intermedio fuera de transacción, que dejaría un proxy lazy de unidadNegocio
    // sin sesión (LazyInitializationException) -- mismo problema que VentaServiceImpl evita
    // resolviendo producto DENTRO de su propio @Transactional. Reusar la misma instancia es seguro
    // acá porque registrarMovimiento nunca muta producto.stock (lo hace el llamador, no este
    // servicio), así que no hay estado desactualizado entre llamadas sucesivas.
    private Producto crearProductoConIngreso(BigDecimal costoUnitario) {
        UnidadNegocio vivero = vivero();
        Producto p = new Producto("Producto Entrega Pendiente " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), costoUnitario, 40, null, null);
        p.setUnidadNegocio(vivero);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());

        // Movimiento INGRESO previo: establece la referencia de costo (Decisión 1, tabla del
        // Context de design.md).
        movimientoStockService.registrarMovimiento(saved, 40, TipoMovimientoStock.INGRESO, jefe());
        return saved;
    }

    // --- 2.1 RED / 2.2 GREEN ---
    @Test
    void registrarMovimientoEntregaPendientePersisteCantidadYCostoCopiadoDelUltimoIngreso() {
        BigDecimal costo = new BigDecimal("50.00");
        Producto producto = crearProductoConIngreso(costo);

        MovimientoStock mov = movimientoStockService.registrarMovimiento(
                producto, 10, TipoMovimientoStock.ENTREGA_PENDIENTE, jefe());

        assertThat(mov.getId()).isNotNull();
        assertThat(mov.getTipoMovimiento()).isEqualTo(TipoMovimientoStock.ENTREGA_PENDIENTE);
        assertThat(mov.getCantidad()).isEqualTo(10);
        // El desglose (rama "egreso de siempre") se copia del último INGRESO -- mismo criterio
        // que ya vale para VENTA/EGRESO/MERMA.
        assertThat(mov.getCostoUnitario()).isEqualByComparingTo(costo);
    }

    // --- 2.3 TRIANGULATE: ENTREGA_PENDIENTE no es referencia de costo ni crea capa ---
    @Test
    void entregaPendienteNoAlteraLaReferenciaDeCostoNiCreaCapa() {
        BigDecimal costoOriginal = new BigDecimal("30.00");
        Producto producto = crearProductoConIngreso(costoOriginal);

        movimientoStockService.registrarMovimiento(producto, 5, TipoMovimientoStock.ENTREGA_PENDIENTE, jefe());

        // Una venta normal posterior sigue congelando el costo del INGRESO original: el tipo
        // nuevo NO entra en la lista [INGRESO, AJUSTE_INICIAL] de referencia de costo.
        MovimientoStock movVenta = movimientoStockService.registrarMovimiento(
                producto, 3, TipoMovimientoStock.VENTA, jefe());
        assertThat(movVenta.getCostoUnitario()).isEqualByComparingTo(costoOriginal);

        // Vivero no tiene costeo por capas habilitado, así que ninguno de los movimientos de
        // arriba pudo haber creado una capa -- verificación explícita del contrato.
        assertThat(capaCostoStockRepository.existsByProductoId(producto.getId())).isFalse();
    }

    // --- 2.4 TRIANGULATE: mismo par de aserciones para REVERSA_ENTREGA_PENDIENTE ---
    @Test
    void reversaEntregaPendienteNoAlteraLaReferenciaDeCostoNiCreaCapa() {
        BigDecimal costoOriginal = new BigDecimal("45.00");
        Producto producto = crearProductoConIngreso(costoOriginal);

        movimientoStockService.registrarMovimiento(producto, 4, TipoMovimientoStock.ENTREGA_PENDIENTE, jefe());
        MovimientoStock movReversa = movimientoStockService.registrarMovimiento(
                producto, 4, TipoMovimientoStock.REVERSA_ENTREGA_PENDIENTE, jefe());

        assertThat(movReversa.getTipoMovimiento()).isEqualTo(TipoMovimientoStock.REVERSA_ENTREGA_PENDIENTE);
        assertThat(movReversa.getCostoUnitario()).isEqualByComparingTo(costoOriginal);

        MovimientoStock movVenta = movimientoStockService.registrarMovimiento(
                producto, 2, TipoMovimientoStock.VENTA, jefe());
        assertThat(movVenta.getCostoUnitario()).isEqualByComparingTo(costoOriginal);

        assertThat(capaCostoStockRepository.existsByProductoId(producto.getId())).isFalse();
    }
}
