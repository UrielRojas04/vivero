package com.vivero.gestion.services;

import com.vivero.gestion.dto.ClienteAdHocDTO;
import com.vivero.gestion.dto.DashboardResumenDTO;
import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.VentaDetalleRequestDTO;
import com.vivero.gestion.dto.VentaDetalleResponseDTO;
import com.vivero.gestion.dto.VentaLiteDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.StockAbono;
import com.vivero.gestion.models.UbicacionAbono;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.MovimientoStockAbonoRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.StockAbonoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Change precio-editable-confirmacion-venta, grupo 2 (y 6.2): el precio por unidad de cada línea
 * de venta pasa a ser ajustable (Decisiones 1 a 4 de design.md), aplicado a las dos ramas de
 * `VentaServiceImpl.crearVenta()` (Vivero/Herramientas y Abono), sin tocar jamás
 * `Producto.precio` (Non-Goal explícito). Base real (Postgres localhost:5433), sin mocks de DB,
 * mismo patrón que VentaDocumentoCasualTest / VentaServiceListarVentasAbonoTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class PrecioAjustadoVentaTest {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private StockAbonoRepository stockAbonoRepository;

    @Autowired
    private MovimientoStockAbonoRepository movimientoStockAbonoRepository;

    @Autowired
    private FinanzasService finanzasService;

    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        // Abono deja rastro en tablas propias (stock_abono / movimientos_stock_abono) que
        // referencian al producto (y, el movimiento, también a la venta): hay que borrarlas antes
        // de borrar producto/venta o la FK lo impide. No-op para productos que nunca pasaron por
        // Abono (las consultas devuelven listas vacías).
        for (Long productoId : productosCreados) {
            movimientoStockAbonoRepository.findByProductoIdOrderByFechaDesc(productoId)
                    .forEach(m -> movimientoStockAbonoRepository.deleteById(m.getId()));
            stockAbonoRepository.findByProductoId(productoId)
                    .forEach(s -> stockAbonoRepository.deleteById(s.getId()));
        }
        ventasCreadas.forEach(ventaRepository::deleteById);
        ventasCreadas.clear();
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
        SecurityContextHolder.clearContext();
        CuentaAbonoContextHolder.clear();
        UnidadNegocioContextHolder.clear();
    }

    private UnidadNegocio unidadPorNombre(String nombre) {
        return unidadNegocioRepository.findByNombre(nombre)
                .orElseThrow(() -> new IllegalStateException("Falta unidad " + nombre + " sembrada"));
    }

    private Long crearProducto(UnidadNegocio unidad, String nombre, BigDecimal precio, int stock) {
        Producto p = new Producto(nombre, "Producto de test", precio, BigDecimal.valueOf(50), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved.getId();
    }

    // Detalle "casual" mínimo para no arrastrar Cliente/FacturaCliente/CuentaCorriente en un test
    // que sólo le interesa el precio por unidad de la línea (mismo criterio simplificador que
    // VentaDocumentoCasualTest usa para su propio caso casual).
    private ClienteAdHocDTO clienteCasual() {
        ClienteAdHocDTO adHoc = new ClienteAdHocDTO();
        adHoc.setNombre("Comprador Precio Ajustado Test " + UUID.randomUUID());
        adHoc.setTelefono("1122334455");
        adHoc.setCasual(true);
        return adHoc;
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

    private VentaDetalleRequestDTO detalle(Long productoId, int cantidad, BigDecimal precioUnitario) {
        VentaDetalleRequestDTO det = new VentaDetalleRequestDTO();
        det.setProductoId(productoId);
        det.setCantidad(cantidad);
        det.setPrecioUnitario(precioUnitario);
        return det;
    }

    // --- 2.2: precio ajustado hacia abajo (Vivero) ---
    @Test
    void ventaConPrecioMenorAlDeListaPersistePrecioAjustadoYReduceElTotal() {
        UnidadNegocio vivero = unidadPorNombre("Vivero");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        BigDecimal precioLista = new BigDecimal("100.00");
        BigDecimal precioAjustado = new BigDecimal("80.00");
        Long productoId = crearProducto(vivero, "Producto Precio Menor " + UUID.randomUUID(), precioLista, 10);

        VentaDetalleRequestDTO det = detalle(productoId, 2, precioAjustado);
        BigDecimal totalEsperado = precioAjustado.multiply(BigDecimal.valueOf(2));
        VentaRequestDTO req = requestConDetalles(List.of(det), totalEsperado);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        VentaDetalleResponseDTO detalleGuardado = response.getDetalles().get(0);
        assertThat(detalleGuardado.getPrecioUnitarioHistorico()).isEqualByComparingTo(precioAjustado);
        assertThat(detalleGuardado.getSubtotal()).isEqualByComparingTo(totalEsperado);
        assertThat(response.getSubtotal()).isEqualByComparingTo(totalEsperado);
        assertThat(response.getTotalFinal()).isEqualByComparingTo(totalEsperado);
    }

    // --- 2.3 triangulación: precio ajustado hacia arriba (Herramientas) ---
    @Test
    void ventaConPrecioMayorAlDeListaAceptaYAumentaElTotal() {
        UnidadNegocio herramientas = unidadPorNombre("Herramientas");
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientas.getId());

        BigDecimal precioLista = new BigDecimal("100.00");
        BigDecimal precioAjustado = new BigDecimal("150.00");
        Long productoId = crearProducto(herramientas, "Producto Precio Mayor " + UUID.randomUUID(), precioLista, 10);

        VentaDetalleRequestDTO det = detalle(productoId, 1, precioAjustado);
        VentaRequestDTO req = requestConDetalles(List.of(det), precioAjustado);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        assertThat(response.getDetalles().get(0).getPrecioUnitarioHistorico()).isEqualByComparingTo(precioAjustado);
        assertThat(response.getTotalFinal()).isEqualByComparingTo(precioAjustado);
    }

    // --- 2.4 triangulación: sin precio informado (regresión del contrato existente) ---
    @Test
    void ventaSinPrecioInformadoUsaElPrecioDeListaComoAntes() {
        UnidadNegocio vivero = unidadPorNombre("Vivero");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        BigDecimal precioLista = new BigDecimal("100.00");
        Long productoId = crearProducto(vivero, "Producto Sin Precio Informado " + UUID.randomUUID(), precioLista, 10);

        VentaDetalleRequestDTO det = detalle(productoId, 3, null);
        BigDecimal totalEsperado = precioLista.multiply(BigDecimal.valueOf(3));
        VentaRequestDTO req = requestConDetalles(List.of(det), totalEsperado);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        assertThat(response.getDetalles().get(0).getPrecioUnitarioHistorico()).isEqualByComparingTo(precioLista);
        assertThat(response.getTotalFinal()).isEqualByComparingTo(totalEsperado);
    }

    // --- 2.5 triangulación: varias líneas, algunas con precio ajustado y otras sin informar ---
    @Test
    void ventaConVariasLineasAlgunasConPrecioAjustadoYOtrasSinInformar() {
        UnidadNegocio vivero = unidadPorNombre("Vivero");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        BigDecimal precioListaA = new BigDecimal("100.00");
        BigDecimal precioAjustadoA = new BigDecimal("70.00");
        Long productoAId = crearProducto(vivero, "Producto Linea Ajustada " + UUID.randomUUID(), precioListaA, 10);

        BigDecimal precioListaB = new BigDecimal("40.00");
        Long productoBId = crearProducto(vivero, "Producto Linea Lista " + UUID.randomUUID(), precioListaB, 10);

        VentaDetalleRequestDTO detA = detalle(productoAId, 2, precioAjustadoA); // 140.00
        VentaDetalleRequestDTO detB = detalle(productoBId, 3, null); // 120.00 (precio de lista)
        BigDecimal totalEsperado = new BigDecimal("260.00");
        VentaRequestDTO req = requestConDetalles(List.of(detA, detB), totalEsperado);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        assertThat(response.getSubtotal()).isEqualByComparingTo(totalEsperado);
        assertThat(response.getTotalFinal()).isEqualByComparingTo(totalEsperado);

        VentaDetalleResponseDTO guardadoA = response.getDetalles().stream()
                .filter(d -> d.getProductoId().equals(productoAId)).findFirst().orElseThrow();
        assertThat(guardadoA.getPrecioUnitarioHistorico()).isEqualByComparingTo(precioAjustadoA);

        VentaDetalleResponseDTO guardadoB = response.getDetalles().stream()
                .filter(d -> d.getProductoId().equals(productoBId)).findFirst().orElseThrow();
        assertThat(guardadoB.getPrecioUnitarioHistorico()).isEqualByComparingTo(precioListaB);
    }

    // --- 2.6 borde: precio en cero (línea bonificada) ---
    @Test
    void precioUnitarioEnCeroSeAceptaConSubtotalCero() {
        UnidadNegocio vivero = unidadPorNombre("Vivero");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        Long productoId = crearProducto(vivero, "Producto Precio Cero " + UUID.randomUUID(), new BigDecimal("100.00"), 10);

        VentaDetalleRequestDTO det = detalle(productoId, 2, BigDecimal.ZERO);
        VentaRequestDTO req = requestConDetalles(List.of(det), BigDecimal.ZERO);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        assertThat(response.getDetalles().get(0).getPrecioUnitarioHistorico()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getDetalles().get(0).getSubtotal()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getTotalFinal()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // --- 2.7 borde: precio negativo rechaza la venta, sin persistir nada ni tocar stock ---
    @Test
    void precioUnitarioNegativoRechazaLaVentaYNoDescuentaStock() {
        UnidadNegocio vivero = unidadPorNombre("Vivero");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        Long productoId = crearProducto(vivero, "Producto Precio Negativo " + UUID.randomUUID(), new BigDecimal("100.00"), 10);

        VentaDetalleRequestDTO det = detalle(productoId, 1, new BigDecimal("-10.00"));
        VentaRequestDTO req = requestConDetalles(List.of(det), BigDecimal.ZERO);

        long ventasAntes = ventaRepository.count();

        assertThatThrownBy(() -> ventaService.crearVenta(req, "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(ventaRepository.count()).isEqualTo(ventasAntes);
        Producto productoDespues = productoRepository.findById(productoId).orElseThrow();
        assertThat(productoDespues.getStock()).isEqualTo(10);
    }

    // --- 2.8 Non-Goal, crítico: el precio de lista del producto queda intacto ---
    @Test
    void elPrecioDeListaDelProductoQuedaIntactoTrasVentaConPrecioAjustado() {
        UnidadNegocio vivero = unidadPorNombre("Vivero");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        BigDecimal precioLista = new BigDecimal("100.00");
        Long productoId = crearProducto(vivero, "Producto Non Goal " + UUID.randomUUID(), precioLista, 10);

        VentaDetalleRequestDTO det1 = detalle(productoId, 1, new BigDecimal("70.00"));
        VentaRequestDTO req1 = requestConDetalles(List.of(det1), new BigDecimal("70.00"));
        VentaResponseDTO resp1 = ventaService.crearVenta(req1, "Sergio");
        ventasCreadas.add(resp1.getId());

        Producto productoTrasVentaAjustada = productoRepository.findById(productoId).orElseThrow();
        assertThat(productoTrasVentaAjustada.getPrecio()).isEqualByComparingTo(precioLista);

        // Segunda venta del mismo producto, sin precio informado: vuelve a usar el precio de lista.
        VentaDetalleRequestDTO det2 = detalle(productoId, 1, null);
        VentaRequestDTO req2 = requestConDetalles(List.of(det2), precioLista);
        VentaResponseDTO resp2 = ventaService.crearVenta(req2, "Sergio");
        ventasCreadas.add(resp2.getId());

        assertThat(resp2.getDetalles().get(0).getPrecioUnitarioHistorico()).isEqualByComparingTo(precioLista);
    }

    // --- 2.9: rama Abono, camino de código separado ---
    @Test
    void ventaEnAbonoConPrecioAjustadoDescuentaStockAbonoYPersisteElPrecio() {
        UnidadNegocio abono = unidadPorNombre("Abono");
        UnidadNegocioContextHolder.setUnidadNegocioId(abono.getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null,
                        List.of(new SimpleGrantedAuthority("ESCRIBIR_VENTAS"))));

        BigDecimal precioLista = new BigDecimal("100.00");
        BigDecimal precioAjustado = new BigDecimal("65.00");
        Long productoId = crearProducto(abono, "Producto Abono Ajustado " + UUID.randomUUID(), precioLista, 0);
        Producto producto = productoRepository.findById(productoId).orElseThrow();
        stockAbonoRepository.save(new StockAbono(producto, UbicacionAbono.INVERNADERO, 10));

        VentaDetalleRequestDTO det = detalle(productoId, 3, precioAjustado);
        BigDecimal totalEsperado = precioAjustado.multiply(BigDecimal.valueOf(3));
        VentaRequestDTO req = requestConDetalles(List.of(det), totalEsperado);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        VentaDetalleResponseDTO detalleGuardado = response.getDetalles().get(0);
        assertThat(detalleGuardado.getPrecioUnitarioHistorico()).isEqualByComparingTo(precioAjustado);
        assertThat(detalleGuardado.getSubtotal()).isEqualByComparingTo(totalEsperado);
        assertThat(response.getTotalFinal()).isEqualByComparingTo(totalEsperado);

        StockAbono stockDespues = stockAbonoRepository
                .findByProductoIdAndUbicacion(productoId, UbicacionAbono.INVERNADERO).orElseThrow();
        assertThat(stockDespues.getCantidad()).isEqualTo(7);
    }

    // --- 6.2: Finanzas refleja el precio ajustado; el costo de mercadería vendida no se altera ---
    @Test
    void elResumenYElListadoDeFinanzasReflejanElPrecioAjustadoSinAlterarElCosto() {
        UnidadNegocio herramientas = unidadPorNombre("Herramientas"); // modelo MERCADERIA_VENDIDA
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientas.getId());

        LocalDateTime desde = LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")).minusMinutes(2);
        LocalDateTime hasta = LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")).plusMinutes(2);

        DashboardResumenDTO antes = finanzasService.resumen(desde, hasta, null);

        BigDecimal precioLista = new BigDecimal("100.00");
        BigDecimal precioAjustado = new BigDecimal("60.00");
        Long productoId = crearProducto(herramientas, "Producto Finanzas Ajustado " + UUID.randomUUID(), precioLista, 10);

        VentaDetalleRequestDTO det = detalle(productoId, 3, precioAjustado);
        BigDecimal totalEsperado = precioAjustado.multiply(BigDecimal.valueOf(3));
        VentaRequestDTO req = requestConDetalles(List.of(det), totalEsperado);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        VentaDetalleResponseDTO detalleGuardado = response.getDetalles().get(0);
        BigDecimal costoEsperado = detalleGuardado.getCostoUnitarioHistorico().multiply(BigDecimal.valueOf(3));

        DashboardResumenDTO despues = finanzasService.resumen(desde, hasta, null);

        assertThat(despues.getTotalVentas().subtract(antes.getTotalVentas())).isEqualByComparingTo(totalEsperado);
        assertThat(despues.getCostoMercaderiaVendida().subtract(antes.getCostoMercaderiaVendida()))
                .isEqualByComparingTo(costoEsperado);

        var pagina = finanzasService.listarVentas(desde, hasta, null, null, PageRequest.of(0, 50));
        VentaLiteDTO ventaLite = pagina.getContent().stream()
                .filter(v -> v.getId().equals(response.getId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("La venta con precio ajustado no aparece en el listado de Finanzas"));
        assertThat(ventaLite.getTotalFinal()).isEqualByComparingTo(totalEsperado);
        BigDecimal gananciaEsperada = precioAjustado.subtract(detalleGuardado.getCostoUnitarioHistorico())
                .multiply(BigDecimal.valueOf(3));
        assertThat(ventaLite.getGananciaNeta()).isEqualByComparingTo(gananciaEsperada);
    }
}
