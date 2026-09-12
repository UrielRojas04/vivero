package com.vivero.gestion.services;

import com.vivero.gestion.dto.DevolucionProductoDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaCorrienteBandejas;
import com.vivero.gestion.models.HistorialBandejas;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteBandejasRepository;
import com.vivero.gestion.repositories.HistorialBandejasRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Bug real reportado por el dueño (2026-09-11, confirmado en producción): ni
 * BandejasServiceImpl.registrarDevolucion (bandejas sueltas) ni
 * DevolucionServiceImpl.registrarDevolucionLlenas (devolución de producto) validaban que la
 * cantidad devuelta no superara lo que el cliente debía -- un cliente terminó con
 * balanceBandejas = -6. Ambos flujos ahora rechazan la operación ANTES de escribir nada si la
 * cantidad supera el saldo actual. Base real (Postgres localhost:5433), sin mocks.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class BandejaSaldoNegativoGuardTest {

    @Autowired
    private BandejasService bandejasService;

    @Autowired
    private DevolucionService devolucionService;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private CuentaCorrienteBandejasRepository ccbRepository;

    @Autowired
    private HistorialBandejasRepository historialBandejasRepository;

    private final List<Long> clientesCreados = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();
    private final List<Long> historialCreados = new ArrayList<>();
    private Long ccbId;

    @AfterEach
    void limpiar() {
        for (Long clienteId : clientesCreados) {
            historialBandejasRepository.findByClienteIdOrderByFechaDesc(clienteId).forEach(h -> {
                if (!historialCreados.contains(h.getId())) historialCreados.add(h.getId());
            });
        }
        historialCreados.forEach(historialBandejasRepository::deleteById);
        historialCreados.clear();
        if (ccbId != null) ccbRepository.deleteById(ccbId);
        ccbId = null;
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
        clientesCreados.forEach(clienteRepository::deleteById);
        clientesCreados.clear();
        SecurityContextHolder.clearContext();
        UnidadNegocioContextHolder.clear();
    }

    private UnidadNegocio vivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private void autenticarComoSergio() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null,
                        List.of(new SimpleGrantedAuthority("ESCRIBIR_CLIENTES"),
                                new SimpleGrantedAuthority("ESCRIBIR_BANDEJAS"))));
    }

    private Cliente crearCliente(UnidadNegocio unidad) {
        Cliente c = new Cliente();
        c.setNombreRazonSocial("Cliente Guard Bandejas Test " + UUID.randomUUID());
        c.setUnidadNegocio(unidad);
        Cliente saved = clienteRepository.save(c);
        clientesCreados.add(saved.getId());
        return saved;
    }

    private Producto crearProducto(UnidadNegocio unidad, int stock) {
        Producto p = new Producto("Producto Guard Bandejas Test " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), new BigDecimal("40.00"), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved;
    }

    private CuentaCorrienteBandejas prepararCcb(Cliente cliente, int balanceInicial) {
        CuentaCorrienteBandejas ccb = new CuentaCorrienteBandejas();
        ccb.setCliente(cliente);
        ccb.setBalanceBandejas(balanceInicial);
        ccb = ccbRepository.save(ccb);
        ccbId = ccb.getId();
        return ccb;
    }

    private DevolucionProductoDTO devolucion(Long clienteId, Long productoId, Integer cantidad) {
        DevolucionProductoDTO dto = new DevolucionProductoDTO();
        dto.setClienteId(clienteId);
        dto.setProductoId(productoId);
        dto.setCantidad(cantidad);
        dto.setMontoAcreditar(BigDecimal.ZERO);
        return dto;
    }

    // --- RED/GREEN: BandejasServiceImpl.registrarDevolucion rechaza si supera el saldo ---
    @Test
    void bandejasServiceRechazaDevolucionQueSuperaElSaldo() {
        UnidadNegocio vivero = vivero();
        Cliente cliente = crearCliente(vivero);
        prepararCcb(cliente, 3);

        assertThatThrownBy(() -> bandejasService.registrarDevolucion(cliente.getId(), 5, "Sergio"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("3")
                .hasMessageContaining("5");

        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(3); // sin cambios
        assertThat(historialBandejasRepository.findByClienteIdOrderByFechaDesc(cliente.getId())).isEmpty();
    }

    // --- TRIANGULATE: exactamente el saldo (límite) es válido, no rechaza ---
    @Test
    void bandejasServiceAceptaDevolverExactamenteElSaldo() {
        UnidadNegocio vivero = vivero();
        Cliente cliente = crearCliente(vivero);
        prepararCcb(cliente, 4);

        bandejasService.registrarDevolucion(cliente.getId(), 4, "Sergio");

        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(0);

        List<HistorialBandejas> historial = historialBandejasRepository.findByClienteIdOrderByFechaDesc(cliente.getId());
        historial.forEach(h -> historialCreados.add(h.getId()));
        assertThat(historial).hasSize(1);
    }

    // --- RED/GREEN: DevolucionServiceImpl.registrarDevolucionLlenas rechaza si supera el saldo ---
    @Test
    void devolucionDeProductoRechazaCantidadQueSuperaElSaldoDeBandejas() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        prepararCcb(cliente, 2);

        assertThatThrownBy(() -> devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 6)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2")
                .hasMessageContaining("6");

        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(2); // sin cambios

        // Nada más debe haberse escrito tampoco: ni producto "DEVUELTO", ni historial.
        assertThat(productoRepository.findByNombreAndUnidadNegocioIdAndDeletedFalse(
                producto.getNombre() + " DEVUELTO", vivero.getId())).isEmpty();
        assertThat(historialBandejasRepository.findByClienteIdOrderByFechaDesc(cliente.getId())).isEmpty();
    }

    // --- TRIANGULATE: cliente sin CuentaCorrienteBandejas todavía (balance implícito 0) rechaza igual ---
    @Test
    void devolucionDeProductoRechazaCuandoClienteNoTieneCuentaBandejasTodavia() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero); // sin prepararCcb: no tiene CuentaCorrienteBandejas
        Producto producto = crearProducto(vivero, 20);

        assertThatThrownBy(() -> devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("0");

        assertThat(productoRepository.findByNombreAndUnidadNegocioIdAndDeletedFalse(
                producto.getNombre() + " DEVUELTO", vivero.getId())).isEmpty();
    }

    // --- TRIANGULATE: exactamente el saldo es válido en el flujo de producto también ---
    @Test
    void devolucionDeProductoAceptaDevolverExactamenteElSaldo() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        prepararCcb(cliente, 5);

        devolucionService.registrarDevolucionLlenas(devolucion(cliente.getId(), producto.getId(), 5));

        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(0);

        historialBandejasRepository.findByClienteIdOrderByFechaDesc(cliente.getId())
                .forEach(h -> historialCreados.add(h.getId()));
    }
}
