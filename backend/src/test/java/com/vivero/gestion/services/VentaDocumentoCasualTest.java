package com.vivero.gestion.services;

import com.vivero.gestion.dto.ClienteAdHocDTO;
import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.VentaDetalleRequestDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoDocumento;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteBandejasRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.VentaRepository;
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
 * Change clientes-dni-cuil, grupo 2: la venta a cliente casual (Herramientas, sin `Cliente`
 * vinculado) admite un documento puntual -- tipo (DNI/CUIL) + valor -- persistido en la propia
 * Venta (Decisión 2 de design.md), nunca en un Cliente. Base real (Postgres localhost:5433), sin
 * mocks de DB, mismo patrón que VentaServiceListarVentasAbonoTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class VentaDocumentoCasualTest {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private CuentaCorrienteDineroRepository cuentaCorrienteDineroRepository;

    @Autowired
    private CuentaCorrienteBandejasRepository cuentaCorrienteBandejasRepository;

    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        ventasCreadas.forEach(ventaRepository::deleteById);
        ventasCreadas.clear();
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
        for (Long id : clientesCreados) {
            cuentaCorrienteDineroRepository.findByClienteId(id)
                    .ifPresent(ccd -> cuentaCorrienteDineroRepository.deleteById(ccd.getId()));
            cuentaCorrienteBandejasRepository.findByClienteId(id)
                    .ifPresent(ccb -> cuentaCorrienteBandejasRepository.deleteById(ccb.getId()));
            clienteRepository.deleteById(id);
        }
        clientesCreados.clear();
        UnidadNegocioContextHolder.clear();
    }

    private UnidadNegocio herramientas() {
        return unidadNegocioRepository.findByNombre("Herramientas")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Herramientas sembrada"));
    }

    private Long crearProducto(UnidadNegocio unidad, String nombre, BigDecimal precio, int stock) {
        Producto p = new Producto(nombre, "Producto de test", precio, BigDecimal.valueOf(50), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved.getId();
    }

    private VentaRequestDTO requestBase(Long productoId, BigDecimal precio) {
        VentaRequestDTO req = new VentaRequestDTO();
        VentaDetalleRequestDTO det = new VentaDetalleRequestDTO();
        det.setProductoId(productoId);
        det.setCantidad(1);
        req.setDetalles(List.of(det));

        PagoRequestDTO pago = new PagoRequestDTO();
        pago.setMonto(precio);
        pago.setMetodoPago("EFECTIVO");
        req.setPagos(List.of(pago));
        return req;
    }

    @Test
    void ventaCasualConDocumentoQuedaSinClienteYConDocumentoPersistido() {
        UnidadNegocio herramientas = herramientas();
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientas.getId());
        BigDecimal precio = new BigDecimal("100.00");
        Long productoId = crearProducto(herramientas, "Producto Casual Doc " + UUID.randomUUID(), precio, 10);

        VentaRequestDTO req = requestBase(productoId, precio);
        ClienteAdHocDTO adHoc = new ClienteAdHocDTO();
        adHoc.setNombre("Comprador Casual Test");
        adHoc.setTelefono("1122334455");
        adHoc.setCasual(true);
        adHoc.setDocumentoTipo("DNI");
        adHoc.setDocumentoValor("30111222");
        req.setClienteAdHoc(adHoc);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        Venta venta = ventaRepository.findById(response.getId()).orElseThrow();
        assertThat(venta.getCliente()).isNull();
        assertThat(venta.getClienteDocumentoCasualTipo()).isEqualTo(TipoDocumento.DNI);
        assertThat(venta.getClienteDocumentoCasualValor()).isEqualTo("30111222");
    }

    // --- Triangulación 2.6: casual == false -- el documento va al Cliente creado, no a la venta ---
    @Test
    void ventaConCreacionDeClienteRealGuardaDocumentoEnElClienteNoEnLaVenta() {
        UnidadNegocio herramientas = herramientas();
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientas.getId());
        BigDecimal precio = new BigDecimal("100.00");
        Long productoId = crearProducto(herramientas, "Producto Cliente Real Doc " + UUID.randomUUID(), precio, 10);

        VentaRequestDTO req = requestBase(productoId, precio);
        ClienteAdHocDTO adHoc = new ClienteAdHocDTO();
        adHoc.setNombre("Cliente Express Con CUIL " + UUID.randomUUID());
        adHoc.setTelefono("1122334455");
        adHoc.setCasual(false);
        adHoc.setDocumentoTipo("CUIL");
        adHoc.setDocumentoValor("20301234563");
        req.setClienteAdHoc(adHoc);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        Venta venta = ventaRepository.findById(response.getId()).orElseThrow();
        assertThat(venta.getCliente()).isNotNull();
        clientesCreados.add(venta.getCliente().getId());
        assertThat(venta.getClienteDocumentoCasualTipo()).isNull();
        assertThat(venta.getClienteDocumentoCasualValor()).isNull();

        Cliente clienteCreado = clienteRepository.findById(venta.getCliente().getId()).orElseThrow();
        assertThat(clienteCreado.getCuil()).isEqualTo("20301234563");
        assertThat(clienteCreado.getDni()).isNull();
    }

    // --- Triangulación 2.7: valor en blanco guarda tipo y valor en null (par consistente) ---
    @Test
    void documentoConValorEnBlancoGuardaTipoYValorNulos() {
        UnidadNegocio herramientas = herramientas();
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientas.getId());
        BigDecimal precio = new BigDecimal("100.00");
        Long productoId = crearProducto(herramientas, "Producto Doc Blanco " + UUID.randomUUID(), precio, 10);

        VentaRequestDTO req = requestBase(productoId, precio);
        ClienteAdHocDTO adHoc = new ClienteAdHocDTO();
        adHoc.setNombre("Comprador Sin Valor Test");
        adHoc.setTelefono("1122334455");
        adHoc.setCasual(true);
        adHoc.setDocumentoTipo("DNI");
        adHoc.setDocumentoValor("   ");
        req.setClienteAdHoc(adHoc);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        Venta venta = ventaRepository.findById(response.getId()).orElseThrow();
        assertThat(venta.getClienteDocumentoCasualTipo()).isNull();
        assertThat(venta.getClienteDocumentoCasualValor()).isNull();
    }

    // --- Triangulación 2.8: tipo no reconocido rechaza la operación, no registra la venta ---
    @Test
    void tipoDeDocumentoNoReconocidoRechazaLaOperacionYNoRegistraLaVenta() {
        UnidadNegocio herramientas = herramientas();
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientas.getId());
        BigDecimal precio = new BigDecimal("100.00");
        Long productoId = crearProducto(herramientas, "Producto Doc Invalido " + UUID.randomUUID(), precio, 10);

        VentaRequestDTO req = requestBase(productoId, precio);
        ClienteAdHocDTO adHoc = new ClienteAdHocDTO();
        adHoc.setNombre("Comprador Doc Invalido Test");
        adHoc.setTelefono("1122334455");
        adHoc.setCasual(true);
        adHoc.setDocumentoTipo("PASAPORTE");
        adHoc.setDocumentoValor("XYZ123");
        req.setClienteAdHoc(adHoc);

        long ventasAntes = ventaRepository.count();

        assertThatThrownBy(() -> ventaService.crearVenta(req, "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(ventaRepository.count()).isEqualTo(ventasAntes);
    }
}
