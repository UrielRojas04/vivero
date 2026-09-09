package com.vivero.gestion.services;

import com.vivero.gestion.dto.ClienteAdHocDTO;
import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.VentaDetalleRequestDTO;
import com.vivero.gestion.dto.VentaDetalleResponseDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.StockAbono;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.UbicacionAbono;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.StockAbonoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Grupo 8 de tasks.md de entregas-pendientes-confirmacion-vivero (Decisión 4 de design.md):
 * {@code VentaService.crearVentaConStockYaDescontado} reutiliza un MovimientoStock ya existente
 * en vez de descontar stock de nuevo -- el camino que usará la confirmación de una
 * EntregaPendiente (grupo 9), pero probado acá de forma aislada sobre VentaService, sin depender
 * de EntregaPendienteService. Base real (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class VentaServiceStockYaDescontadoTest {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private MovimientoStockRepository movimientoStockRepository;

    @Autowired
    private MovimientoStockService movimientoStockService;

    @Autowired
    private StockAbonoRepository stockAbonoRepository;

    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        ventasCreadas.forEach(ventaRepository::deleteById);
        ventasCreadas.clear();
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
        SecurityContextClear();
        CuentaAbonoContextHolder.clear();
        UnidadNegocioContextHolder.clear();
    }

    private void SecurityContextClear() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    private UnidadNegocio unidadPorNombre(String nombre) {
        return unidadNegocioRepository.findByNombre(nombre)
                .orElseThrow(() -> new IllegalStateException("Falta unidad " + nombre + " sembrada"));
    }

    private Producto crearProducto(UnidadNegocio unidad, int stock) {
        Producto p = new Producto("Producto Stock Ya Descontado " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), new BigDecimal("40.00"), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved;
    }

    // Simula el MovimientoStock ENTREGA_PENDIENTE ya creado al registrar una entrega: el costo
    // congelado que trae ESTE movimiento es el que crearVentaConStockYaDescontado debe copiar, sin
    // tocar el producto ni crear uno nuevo (Decisión 3 de design.md).
    private MovimientoStock movimientoYaDescontado(Producto producto, int cantidad) {
        Usuario usuario = usuarioRepository.findByUsername("Sergio").orElseThrow();
        return movimientoStockService.registrarMovimiento(
                producto, cantidad, TipoMovimientoStock.ENTREGA_PENDIENTE, usuario);
    }

    private ClienteAdHocDTO clienteCasual() {
        ClienteAdHocDTO adHoc = new ClienteAdHocDTO();
        adHoc.setNombre("Comprador Stock Ya Descontado " + UUID.randomUUID());
        adHoc.setTelefono("1122334455");
        adHoc.setCasual(true);
        return adHoc;
    }

    private VentaDetalleRequestDTO detalle(Long productoId, int cantidad, BigDecimal precioUnitario) {
        VentaDetalleRequestDTO det = new VentaDetalleRequestDTO();
        det.setProductoId(productoId);
        det.setCantidad(cantidad);
        det.setPrecioUnitario(precioUnitario);
        return det;
    }

    private VentaRequestDTO requestConDetalles(List<VentaDetalleRequestDTO> detalles, BigDecimal totalAPagar) {
        VentaRequestDTO req = new VentaRequestDTO();
        req.setDetalles(detalles);
        req.setClienteAdHoc(clienteCasual());
        PagoRequestDTO pago = new PagoRequestDTO();
        pago.setMonto(totalAPagar);
        pago.setMetodoPago("EFECTIVO");
        req.setPagos(List.of(pago));
        return req;
    }

    // --- 8.3 RED / 8.4 GREEN ---
    @Test
    void creaLaVentaSinTocarStockYReutilizaElMovimientoExistente() {
        UnidadNegocio vivero = unidadPorNombre("Vivero");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 30); // stock que YA quedó así tras la entrega
        long movimientosAntes = movimientoStockRepository.count();

        MovimientoStock movYaHecho = movimientoYaDescontado(producto, 10);
        long movimientosTrasEntrega = movimientoStockRepository.count();
        assertThat(movimientosTrasEntrega).isEqualTo(movimientosAntes + 1);

        VentaDetalleRequestDTO det = detalle(producto.getId(), 10, new BigDecimal("150.00"));
        VentaRequestDTO req = requestConDetalles(List.of(det), new BigDecimal("1500.00"));

        VentaResponseDTO response = ventaService.crearVentaConStockYaDescontado(
                req, "Sergio", List.of(movYaHecho));
        ventasCreadas.add(response.getId());

        Producto productoDespues = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(productoDespues.getStock()).isEqualTo(30); // sin cambios

        assertThat(movimientoStockRepository.count()).isEqualTo(movimientosTrasEntrega); // ningún movimiento nuevo

        VentaDetalleResponseDTO detalleGuardado = response.getDetalles().get(0);
        assertThat(detalleGuardado.getSubtotal()).isEqualByComparingTo("1500.00");
        assertThat(detalleGuardado.getCostoUnitarioHistorico()).isEqualByComparingTo(movYaHecho.getCostoUnitario());
    }

    // --- 8.5 TRIANGULATE: tamaño distinto o elemento null rechaza sin persistir nada ---
    @Test
    void tamanioDistintoOElementoNullRechazaSinPersistirNada() {
        UnidadNegocio vivero = unidadPorNombre("Vivero");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 30);
        MovimientoStock mov = movimientoYaDescontado(producto, 10);
        long ventasAntes = ventaRepository.count();

        VentaDetalleRequestDTO det = detalle(producto.getId(), 10, new BigDecimal("150.00"));
        VentaRequestDTO reqTamanioDistinto = requestConDetalles(List.of(det), new BigDecimal("1500.00"));

        assertThatThrownBy(() -> ventaService.crearVentaConStockYaDescontado(
                reqTamanioDistinto, "Sergio", List.of(mov, mov)))
                .isInstanceOf(IllegalArgumentException.class);

        List<MovimientoStock> conNull = new ArrayList<>();
        conNull.add(null);
        VentaRequestDTO reqElementoNull = requestConDetalles(List.of(det), new BigDecimal("1500.00"));
        assertThatThrownBy(() -> ventaService.crearVentaConStockYaDescontado(
                reqElementoNull, "Sergio", conNull))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(ventaRepository.count()).isEqualTo(ventasAntes);
    }

    // --- 8.6 TRIANGULATE: unidad activa Abono rechaza ---
    @Test
    void unidadActivaAbonoRechaza() {
        UnidadNegocio abono = unidadPorNombre("Abono");
        UnidadNegocioContextHolder.setUnidadNegocioId(abono.getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);

        Producto producto = crearProducto(abono, 0);
        stockAbonoRepository.save(new StockAbono(producto, UbicacionAbono.INVERNADERO, 10));

        // No hace falta un MovimientoStock real de Vivero: el guard de unidad debe disparar
        // ANTES de mirar el contenido de la lista.
        VentaDetalleRequestDTO det = detalle(producto.getId(), 3, new BigDecimal("150.00"));
        VentaRequestDTO req = requestConDetalles(List.of(det), new BigDecimal("450.00"));

        long ventasAntes = ventaRepository.count();

        assertThatThrownBy(() -> ventaService.crearVentaConStockYaDescontado(
                req, "Sergio", List.of(new MovimientoStock())))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(ventaRepository.count()).isEqualTo(ventasAntes);
    }

    // --- 8.7 TRIANGULATE: crearVenta normal (movimientosPorLinea == null) sigue igual ---
    @Test
    void crearVentaNormalSigueDescontandoStockYCreandoSuPropioMovimiento() {
        UnidadNegocio vivero = unidadPorNombre("Vivero");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        long movimientosAntes = movimientoStockRepository.count();

        VentaDetalleRequestDTO det = detalle(producto.getId(), 10, new BigDecimal("150.00"));
        VentaRequestDTO req = requestConDetalles(List.of(det), new BigDecimal("1500.00"));

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        Producto productoDespues = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(productoDespues.getStock()).isEqualTo(30);
        assertThat(movimientoStockRepository.count()).isEqualTo(movimientosAntes + 1);

        MovimientoStock ultimoMov = movimientoStockRepository.findAll().stream()
                .filter(m -> m.getProducto() != null && m.getProducto().getId().equals(producto.getId()))
                .findFirst().orElseThrow();
        assertThat(ultimoMov.getTipoMovimiento()).isEqualTo(TipoMovimientoStock.VENTA);
    }
}
