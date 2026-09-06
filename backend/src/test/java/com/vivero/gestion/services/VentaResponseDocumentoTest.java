package com.vivero.gestion.services;

import com.vivero.gestion.dto.ClienteAdHocDTO;
import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.VentaDetalleRequestDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
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

/**
 * Change clientes-dni-cuil, grupo 3: `VentaResponseDTO` expone `clienteDni`/`clienteCuil` como
 * proyección unificada (Decisión 3 de design.md) -- el frontend no debe distinguir si la venta
 * tiene `Cliente` real o datos casuales. Base real (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class VentaResponseDocumentoTest {

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

    private UnidadNegocio vivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private UnidadNegocio herramientas() {
        return unidadNegocioRepository.findByNombre("Herramientas")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Herramientas sembrada"));
    }

    private Long crearProducto(UnidadNegocio unidad, BigDecimal precio, int stock) {
        Producto p = new Producto("Producto Response Doc " + UUID.randomUUID(), "Producto de test", precio, BigDecimal.valueOf(50), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved.getId();
    }

    private Cliente crearCliente(UnidadNegocio unidad, String dni, String cuil) {
        Cliente c = new Cliente();
        c.setNombreRazonSocial("Cliente Response Doc Test " + UUID.randomUUID());
        c.setUnidadNegocio(unidad);
        c.setDni(dni);
        c.setCuil(cuil);
        Cliente saved = clienteRepository.save(c);
        clientesCreados.add(saved.getId());
        return saved;
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
    void ventaConClienteQueTieneDniYCuilExponeAmbosEnElDTO() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Cliente cliente = crearCliente(vivero, "30111222", "20301112223");
        BigDecimal precio = new BigDecimal("100.00");
        Long productoId = crearProducto(vivero, precio, 10);

        VentaRequestDTO req = requestBase(productoId, precio);
        req.setClienteId(cliente.getId());

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        assertThat(response.getClienteDni()).isEqualTo("30111222");
        assertThat(response.getClienteCuil()).isEqualTo("20301112223");
    }

    // --- Triangulación 3.4: venta casual con documento puntual ---
    @Test
    void ventaCasualConDocumentoExponeSoloElCampoQueCorrespondeAlTipo() {
        UnidadNegocio herramientas = herramientas();
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientas.getId());
        BigDecimal precio = new BigDecimal("100.00");
        Long productoId = crearProducto(herramientas, precio, 10);

        VentaRequestDTO req = requestBase(productoId, precio);
        ClienteAdHocDTO adHoc = new ClienteAdHocDTO();
        adHoc.setNombre("Comprador Casual Response Test");
        adHoc.setTelefono("1122334455");
        adHoc.setCasual(true);
        adHoc.setDocumentoTipo("CUIL");
        adHoc.setDocumentoValor("20301234563");
        req.setClienteAdHoc(adHoc);

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        assertThat(response.getClienteCuil()).isEqualTo("20301234563");
        assertThat(response.getClienteDni()).isNull();
    }

    // --- Triangulación 3.5: sin documento y cliente eliminado ---
    @Test
    void ventaSinDocumentoExponeAmbosCamposNulos() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Cliente cliente = crearCliente(vivero, null, null);
        BigDecimal precio = new BigDecimal("100.00");
        Long productoId = crearProducto(vivero, precio, 10);

        VentaRequestDTO req = requestBase(productoId, precio);
        req.setClienteId(cliente.getId());

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        assertThat(response.getClienteDni()).isNull();
        assertThat(response.getClienteCuil()).isNull();
    }

    @Test
    void ventaDeClienteEliminadoExponeAmbosCamposNulosYNoFalla() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Cliente cliente = crearCliente(vivero, "30999888", null);
        BigDecimal precio = new BigDecimal("100.00");
        Long productoId = crearProducto(vivero, precio, 10);

        VentaRequestDTO req = requestBase(productoId, precio);
        req.setClienteId(cliente.getId());

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        // Borrado del cliente DESPUÉS de la venta (soft delete): el listado.
        cuentaCorrienteDineroRepository.findByClienteId(cliente.getId())
                .ifPresent(ccd -> cuentaCorrienteDineroRepository.deleteById(ccd.getId()));
        cuentaCorrienteBandejasRepository.findByClienteId(cliente.getId())
                .ifPresent(ccb -> cuentaCorrienteBandejasRepository.deleteById(ccb.getId()));
        clienteRepository.deleteById(cliente.getId());
        clientesCreados.remove(cliente.getId());

        List<VentaResponseDTO> todas = ventaService.listarVentas();
        VentaResponseDTO ventaEncontrada = todas.stream()
                .filter(v -> v.getId().equals(response.getId()))
                .findFirst()
                .orElseThrow();
        assertThat(ventaEncontrada.getClienteDni()).isNull();
        assertThat(ventaEncontrada.getClienteCuil()).isNull();
    }
}
