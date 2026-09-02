package com.vivero.gestion.services;

import com.vivero.gestion.dto.PedidoDTO;
import com.vivero.gestion.dto.PedidoDetalleDTO;
import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.dto.RecepcionItemDTO;
import com.vivero.gestion.dto.RecepcionPedidoDTO;
import com.vivero.gestion.models.EstadoPedido;
import com.vivero.gestion.models.MonedaCosto;
import com.vivero.gestion.models.Pedido;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.Proveedor;
import com.vivero.gestion.repositories.PedidoRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.ProveedorRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
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
 * Grupo 12 de tasks.md de codigo-barras-herramientas (extensión post-cierre, escaneo de código de
 * barras en el momento de confirmar la recepción de un pedido) — 4 casos, base real (sin mocks de
 * DB), PostgreSQL de desarrollo (localhost:5433/vivero_db), mismo patrón que
 * ProductoCodigoBarraTest.
 *
 * Cada test crea sus propios proveedor/productos/pedido con nombres/códigos únicos (prefijo UUID)
 * y los borra en @AfterEach.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class PedidoRecepcionCodigoBarraTest {

    private static final String USERNAME = "jefe@vivero.com";

    @Autowired
    private PedidoService pedidoService;

    @Autowired
    private ProductoService productoService;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private ProveedorRepository proveedorRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private final List<Long> productosCreados = new ArrayList<>();
    private final List<Long> pedidosCreados = new ArrayList<>();
    private final List<Long> proveedoresCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        UnidadNegocioContextHolder.clear();
        for (Long id : pedidosCreados) {
            pedidoRepository.findById(id).ifPresent(pedidoRepository::delete);
        }
        pedidosCreados.clear();
        for (Long id : productosCreados) {
            productoRepository.findById(id).ifPresent(productoRepository::delete);
        }
        productosCreados.clear();
        for (Long id : proveedoresCreados) {
            proveedorRepository.findById(id).ifPresent(proveedorRepository::delete);
        }
        proveedoresCreados.clear();
    }

    private Long herramientasId() {
        return unidadNegocioRepository.findByNombre("Herramientas")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Herramientas sembrada"))
                .getId();
    }

    private String codigoUnico() {
        return "REC-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private Proveedor crearProveedor(String nombre) {
        Proveedor proveedor = new Proveedor();
        proveedor.setNombre(nombre);
        proveedor.setUnidadNegocio(unidadNegocioRepository.getReferenceById(herramientasId()));
        Proveedor guardado = proveedorRepository.save(proveedor);
        proveedoresCreados.add(guardado.getId());
        return guardado;
    }

    private ProductoDTO crearProductoExistente(String nombre, String codigoBarra) {
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        ProductoDTO dto = new ProductoDTO();
        dto.setNombre(nombre);
        dto.setDescripcion("Producto de test — " + nombre);
        dto.setPrecio(new BigDecimal("100.00"));
        dto.setStock(0);
        dto.setCodigoBarra(codigoBarra);
        ProductoDTO creado = productoService.crearProducto(dto);
        productosCreados.add(creado.getId());
        return creado;
    }

    private PedidoDTO crearPedidoConDetalleExistente(Proveedor proveedor, Long productoId, int cantidadPedida) {
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        PedidoDetalleDTO detalle = PedidoDetalleDTO.builder()
                .productoId(productoId)
                .cantidadPedida(cantidadPedida)
                .costoUnitarioPactado(new BigDecimal("50.00"))
                .monedaLinea(MonedaCosto.ARS)
                .build();
        PedidoDTO pedidoDTO = PedidoDTO.builder()
                .proveedorId(proveedor.getId())
                .detalles(List.of(detalle))
                .build();
        PedidoDTO creado = pedidoService.crear(pedidoDTO, USERNAME);
        pedidosCreados.add(creado.getId());
        return creado;
    }

    // 12.5a — confirmar recepción con código nuevo en una línea EXISTENTE lo persiste.
    @Test
    void confirmarRecepcionConCodigoEnLineaExistenteLoPersiste() {
        Proveedor proveedor = crearProveedor("Proveedor 12.5a " + UUID.randomUUID());
        ProductoDTO productoExistente = crearProductoExistente("Pinza 12.5a " + UUID.randomUUID(), null);

        PedidoDTO pedido = crearPedidoConDetalleExistente(proveedor, productoExistente.getId(), 5);
        Long detalleId = pedido.getDetalles().get(0).getId();
        String codigo = codigoUnico();

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        RecepcionItemDTO item = new RecepcionItemDTO(detalleId, 5, codigo);
        pedidoService.confirmarRecepcion(pedido.getId(), new RecepcionPedidoDTO(List.of(item)), USERNAME);

        Producto enBase = productoRepository.findById(productoExistente.getId()).orElseThrow();
        assertThat(enBase.getCodigoBarra()).isEqualTo(codigo);
        assertThat(enBase.getStock()).isEqualTo(5);
    }

    // 12.5b — confirmar recepción de una línea PENDIENTE con código la crea con ese código.
    @Test
    void confirmarRecepcionDeLineaPendienteConCodigoLaCreaConEseCodigo() {
        Proveedor proveedor = crearProveedor("Proveedor 12.5b " + UUID.randomUUID());
        String nombreNuevo = "Sierra Nueva 12.5b " + UUID.randomUUID();

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        PedidoDetalleDTO detallePendiente = PedidoDetalleDTO.builder()
                .productoNombreNuevo(nombreNuevo)
                .cantidadPedida(3)
                .costoUnitarioPactado(new BigDecimal("70.00"))
                .monedaLinea(MonedaCosto.ARS)
                .build();
        PedidoDTO pedidoDTO = PedidoDTO.builder()
                .proveedorId(proveedor.getId())
                .detalles(List.of(detallePendiente))
                .build();
        PedidoDTO pedido = pedidoService.crear(pedidoDTO, USERNAME);
        pedidosCreados.add(pedido.getId());

        Long detalleId = pedido.getDetalles().get(0).getId();
        String codigo = codigoUnico();

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        RecepcionItemDTO item = new RecepcionItemDTO(detalleId, 3, codigo);
        PedidoDTO confirmado = pedidoService.confirmarRecepcion(
                pedido.getId(), new RecepcionPedidoDTO(List.of(item)), USERNAME);

        Long productoCreadoId = confirmado.getDetalles().get(0).getProductoId();
        assertThat(productoCreadoId).isNotNull();
        productosCreados.add(productoCreadoId);

        Producto enBase = productoRepository.findById(productoCreadoId).orElseThrow();
        assertThat(enBase.getCodigoBarra()).isEqualTo(codigo);
        assertThat(enBase.getNombre()).isEqualTo(nombreNuevo);
        assertThat(enBase.getStock()).isEqualTo(3);
    }

    // 12.5c — un código ya usado por otro producto de la misma unidad hace fallar TODA la
    // confirmación, sin ingresar stock de NINGÚN ítem (transacción abortada).
    @Test
    void codigoDuplicadoAbortaTodaLaConfirmacionSinIngresarStockDeNingunItem() {
        Proveedor proveedor = crearProveedor("Proveedor 12.5c " + UUID.randomUUID());
        String codigoConflictivo = codigoUnico();
        ProductoDTO productoConflictivo =
                crearProductoExistente("Ya tiene código 12.5c " + UUID.randomUUID(), codigoConflictivo);

        ProductoDTO productoA = crearProductoExistente("Producto A 12.5c " + UUID.randomUUID(), null);
        ProductoDTO productoB = crearProductoExistente("Producto B 12.5c " + UUID.randomUUID(), null);

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        PedidoDetalleDTO detalleA = PedidoDetalleDTO.builder()
                .productoId(productoA.getId())
                .cantidadPedida(5)
                .costoUnitarioPactado(new BigDecimal("50.00"))
                .monedaLinea(MonedaCosto.ARS)
                .build();
        PedidoDetalleDTO detalleB = PedidoDetalleDTO.builder()
                .productoId(productoB.getId())
                .cantidadPedida(4)
                .costoUnitarioPactado(new BigDecimal("60.00"))
                .monedaLinea(MonedaCosto.ARS)
                .build();
        PedidoDTO pedidoDTO = PedidoDTO.builder()
                .proveedorId(proveedor.getId())
                // Orden deliberado: A primero (se procesaría e ingresaría stock primero dentro de
                // la misma transacción) y B (el que dispara el conflicto) segundo — para probar
                // rollback real, no sólo que el loop nunca llega a B.
                .detalles(List.of(detalleA, detalleB))
                .build();
        PedidoDTO pedido = pedidoService.crear(pedidoDTO, USERNAME);
        pedidosCreados.add(pedido.getId());

        Long detalleIdA = pedido.getDetalles().get(0).getId();
        Long detalleIdB = pedido.getDetalles().get(1).getId();

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        RecepcionItemDTO itemA = new RecepcionItemDTO(detalleIdA, 5, null);
        RecepcionItemDTO itemB = new RecepcionItemDTO(detalleIdB, 4, codigoConflictivo);
        RecepcionPedidoDTO recepcionDTO = new RecepcionPedidoDTO(List.of(itemA, itemB));

        assertThatThrownBy(() -> pedidoService.confirmarRecepcion(pedido.getId(), recepcionDTO, USERNAME))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(productoConflictivo.getNombre());

        // Ningún ítem ingresó stock — ni siquiera A, que se procesa ANTES que B en el loop.
        Producto enBaseA = productoRepository.findById(productoA.getId()).orElseThrow();
        Producto enBaseB = productoRepository.findById(productoB.getId()).orElseThrow();
        assertThat(enBaseA.getStock()).isEqualTo(0);
        assertThat(enBaseB.getStock()).isEqualTo(0);
        assertThat(enBaseB.getCodigoBarra()).isNull();

        Pedido pedidoEnBase = pedidoRepository.findById(pedido.getId()).orElseThrow();
        assertThat(pedidoEnBase.getEstado()).isEqualTo(EstadoPedido.PENDIENTE);
    }

    // 12.5d — confirmar sin mandar codigoBarra en ningún ítem sigue funcionando exactamente igual
    // que antes (regresión).
    @Test
    void confirmarSinCodigoBarraEnNingunItemFuncionaIgualQueAntes() {
        Proveedor proveedor = crearProveedor("Proveedor 12.5d " + UUID.randomUUID());
        ProductoDTO productoExistente = crearProductoExistente("Rastrillo 12.5d " + UUID.randomUUID(), null);

        PedidoDTO pedido = crearPedidoConDetalleExistente(proveedor, productoExistente.getId(), 7);
        Long detalleId = pedido.getDetalles().get(0).getId();

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        RecepcionItemDTO item = new RecepcionItemDTO(detalleId, 7, null);
        PedidoDTO confirmado = pedidoService.confirmarRecepcion(
                pedido.getId(), new RecepcionPedidoDTO(List.of(item)), USERNAME);

        assertThat(confirmado.getEstado()).isEqualTo(EstadoPedido.COMPLETO);

        Producto enBase = productoRepository.findById(productoExistente.getId()).orElseThrow();
        assertThat(enBase.getStock()).isEqualTo(7);
        assertThat(enBase.getCodigoBarra()).isNull();
    }
}
