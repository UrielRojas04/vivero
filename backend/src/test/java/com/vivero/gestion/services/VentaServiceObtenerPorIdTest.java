package com.vivero.gestion.services;

import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.models.VentaDetalle;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.ProductoRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pedido puntual del dueño: botón "ver remito" en el historial de cobros de Abono. Necesita traer
 * una venta puntual por id, con sus items, SIN partir por CuentaAbonoContextHolder -- el mismo
 * criterio de vista global que ya sostiene historial-cobros-abono (el jefe tiene que poder abrir
 * el remito de una venta cobrada por el colega, y viceversa).
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class VentaServiceObtenerPorIdTest {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        UnidadNegocioContextHolder.clear();
        CuentaAbonoContextHolder.clear();
        for (Long id : ventasCreadas) ventaRepository.deleteById(id);
        ventasCreadas.clear();
        for (Long id : clientesCreados) clienteRepository.deleteById(id);
        clientesCreados.clear();
    }

    private UnidadNegocio abono() {
        return unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Abono sembrada"));
    }

    private Cliente crearCliente(UnidadNegocio unidad, String nombre) {
        Cliente c = new Cliente();
        c.setNombreRazonSocial(nombre);
        c.setUnidadNegocio(unidad);
        Cliente guardado = clienteRepository.save(c);
        clientesCreados.add(guardado.getId());
        return guardado;
    }

    private Venta crearVentaConItem(UnidadNegocio unidad, CuentaAbono cuenta, Cliente cliente) {
        Venta v = new Venta();
        v.setUnidadNegocio(unidad);
        v.setCuentaAbono(cuenta);
        v.setCliente(cliente);
        v.setSubtotal(BigDecimal.TEN);
        v.setTotalFinal(BigDecimal.TEN);
        v.setEstadoPago("PAGADO");
        v.setFecha(LocalDateTime.now());

        Producto producto = productoRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay productos sembrados para el test"));

        VentaDetalle detalle = new VentaDetalle();
        detalle.setProducto(producto);
        detalle.setCantidad(1);
        detalle.setPrecioUnitarioHistorico(BigDecimal.TEN);
        detalle.setCostoUnitarioHistorico(BigDecimal.ONE);
        detalle.setSubtotal(BigDecimal.TEN);
        v.addDetalle(detalle);

        Venta guardada = ventaRepository.save(v);
        ventasCreadas.add(guardada.getId());
        return guardada;
    }

    @Test
    void obtenerPorIdDevuelveVentaConSusItems() {
        Cliente cliente = crearCliente(abono(), "Cliente Remito " + UUID.randomUUID());
        Venta venta = crearVentaConItem(abono(), CuentaAbono.JEFE, cliente);

        VentaResponseDTO dto = ventaService.obtenerPorId(venta.getId());

        assertThat(dto.getId()).isEqualTo(venta.getId());
        assertThat(dto.getDetalles()).isNotEmpty();
    }

    @Test
    void obtenerPorIdEsGlobalNoSeParticionaPorCuenta() {
        Cliente cliente = crearCliente(abono(), "Cliente Remito Cruzado " + UUID.randomUUID());
        Venta ventaDeColega = crearVentaConItem(abono(), CuentaAbono.COLEGA, cliente);

        UnidadNegocioContextHolder.setUnidadNegocioId(abono().getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);

        VentaResponseDTO dto = ventaService.obtenerPorId(ventaDeColega.getId());

        assertThat(dto.getId()).isEqualTo(ventaDeColega.getId());
    }

    @Test
    void obtenerPorIdInexistenteLanzaError() {
        assertThatThrownBy(() -> ventaService.obtenerPorId(Long.MAX_VALUE))
                .isInstanceOf(RuntimeException.class);
    }
}
