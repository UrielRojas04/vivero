package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EntregaPendiente;
import com.vivero.gestion.models.EntregaPendienteDetalle;
import com.vivero.gestion.models.EstadoEntregaPendiente;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.services.MovimientoStockService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Grupo 4 de tasks.md de entregas-pendientes-confirmacion-vivero, tarea 4.5: round-trip completo
 * de una EntregaPendiente con dos EntregaPendienteDetalle -- incluida la firma (data-URL PNG
 * larga, sin truncar: la columna es TEXT a propósito, Decisión 5 de design.md). Base real
 * (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class EntregaPendienteRepositoryTest {

    @Autowired
    private EntregaPendienteRepository entregaPendienteRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private MovimientoStockService movimientoStockService;

    private final List<Long> entregasCreadas = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        entregasCreadas.forEach(entregaPendienteRepository::deleteById);
        entregasCreadas.clear();
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
        clientesCreados.forEach(clienteRepository::deleteById);
        clientesCreados.clear();
    }

    private UnidadNegocio vivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private Usuario jefe() {
        return usuarioRepository.findByUsername("Sergio")
                .orElseThrow(() -> new IllegalStateException("Falta usuario Sergio sembrado"));
    }

    private Producto crearProducto(UnidadNegocio vivero, int stock) {
        Producto p = new Producto("Producto Repo Entrega " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), new BigDecimal("40.00"), stock, null, null);
        p.setUnidadNegocio(vivero);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved;
    }

    private Cliente crearCliente() {
        Cliente c = new Cliente();
        c.setNombreRazonSocial("Cliente Repo Entrega " + UUID.randomUUID());
        c.setTelefono("1122334455");
        Cliente saved = clienteRepository.save(c);
        clientesCreados.add(saved.getId());
        return saved;
    }

    @Test
    void persisteYRecuperaUnaEntregaConDosDetallesYSuFirmaIntacta() {
        UnidadNegocio vivero = vivero();
        Usuario jefe = jefe();
        Cliente cliente = crearCliente();

        Producto productoA = crearProducto(vivero, 20);
        Producto productoB = crearProducto(vivero, 15);

        MovimientoStock movA = movimientoStockService.registrarMovimiento(
                productoA, 5, TipoMovimientoStock.ENTREGA_PENDIENTE, jefe);
        MovimientoStock movB = movimientoStockService.registrarMovimiento(
                productoB, 3, TipoMovimientoStock.ENTREGA_PENDIENTE, jefe);

        // Data-URL PNG larga (~50 KB de base64), muy por debajo del tope de 512 KB, pero mucho más
        // larga que cualquier VARCHAR corto -- si la columna no fuera TEXT, esto se truncaría.
        String firmaLarga = "data:image/png;base64," + "A".repeat(50_000);

        EntregaPendiente entrega = new EntregaPendiente();
        entrega.setCliente(cliente);
        entrega.setUsuarioRegistro(jefe);
        entrega.setUnidadNegocio(vivero);
        entrega.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        entrega.setEstado(EstadoEntregaPendiente.PENDIENTE);
        entrega.setFirmaBase64(firmaLarga);
        entrega.setObservacion("Observación de prueba");

        EntregaPendienteDetalle detA = new EntregaPendienteDetalle();
        detA.setProducto(productoA);
        detA.setCantidad(5);
        detA.setMovimientoStock(movA);
        entrega.addDetalle(detA);

        EntregaPendienteDetalle detB = new EntregaPendienteDetalle();
        detB.setProducto(productoB);
        detB.setCantidad(3);
        detB.setMovimientoStock(movB);
        entrega.addDetalle(detB);

        EntregaPendiente guardada = entregaPendienteRepository.save(entrega);
        entregasCreadas.add(guardada.getId());

        EntregaPendiente recuperada = entregaPendienteRepository.findByIdWithDetalles(guardada.getId())
                .orElseThrow(() -> new AssertionError("No se recuperó la entrega guardada"));

        assertThat(recuperada.getFirmaBase64()).isEqualTo(firmaLarga);
        assertThat(recuperada.getFirmaBase64()).hasSize(firmaLarga.length());
        assertThat(recuperada.getEstado()).isEqualTo(EstadoEntregaPendiente.PENDIENTE);
        assertThat(recuperada.getCliente().getId()).isEqualTo(cliente.getId());
        assertThat(recuperada.getDetalles()).hasSize(2);
        assertThat(recuperada.getDetalles()).extracting(d -> d.getProducto().getId())
                .containsExactlyInAnyOrder(productoA.getId(), productoB.getId());
        assertThat(recuperada.getDetalles()).extracting(EntregaPendienteDetalle::getMovimientoStock)
                .extracting(MovimientoStock::getId)
                .containsExactlyInAnyOrder(movA.getId(), movB.getId());

        // Listado paginado por unidad + estado (base para el grupo 7): la entrega recién creada
        // aparece.
        var pagina = entregaPendienteRepository.findByUnidadNegocioIdAndEstadoOptional(
                vivero.getId(), EstadoEntregaPendiente.PENDIENTE, PageRequest.of(0, 20));
        assertThat(pagina.getContent()).extracting(EntregaPendiente::getId).contains(guardada.getId());

        // Listado "mías" por usuario que registró.
        var paginaMias = entregaPendienteRepository.findByUnidadNegocioIdAndUsuarioRegistroIdOrderByFechaDesc(
                vivero.getId(), jefe.getId(), PageRequest.of(0, 20));
        assertThat(paginaMias.getContent()).extracting(EntregaPendiente::getId).contains(guardada.getId());
    }
}
