package com.vivero.gestion.services.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.PedidoDTO;
import com.vivero.gestion.dto.PedidoDetalleDTO;
import com.vivero.gestion.dto.RecepcionItemDTO;
import com.vivero.gestion.dto.RecepcionPedidoDTO;
import com.vivero.gestion.models.EstadoPedido;
import com.vivero.gestion.models.Pedido;
import com.vivero.gestion.models.PedidoDetalle;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.Proveedor;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.PedidoRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.ProveedorRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.MovimientoStockService;
import com.vivero.gestion.services.PedidoService;
import com.vivero.gestion.services.ProductoService;
import com.vivero.gestion.dto.ProductoDTO;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PedidoServiceImpl implements PedidoService {

    private final PedidoRepository pedidoRepository;
    private final ProveedorRepository proveedorRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final MovimientoStockService movimientoStockService;
    private final ProductoService productoService;

    @Override
    @Transactional
    public PedidoDTO crear(PedidoDTO dto, String username) {
        if (dto.getDetalles() == null || dto.getDetalles().isEmpty()) {
            throw new IllegalArgumentException("El pedido debe tener al menos un ítem.");
        }
        for (PedidoDetalleDTO d : dto.getDetalles()) {
            validarItemDetalle(d);
        }

        if (dto.getProveedorId() == null) {
            throw new IllegalArgumentException("El pedido debe indicar un proveedor.");
        }

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        Proveedor proveedor = buscarProveedor(dto.getProveedorId(), unidadId);

        Usuario usuario = obtenerUsuario(username);

        Pedido pedido = new Pedido();
        pedido.setProveedor(proveedor);
        pedido.setUsuario(usuario);
        pedido.setFechaCreacion(LocalDateTime.now());
        pedido.setEstado(EstadoPedido.PENDIENTE);
        pedido.setObservaciones(dto.getObservaciones());

        if (unidadId != null) {
            pedido.setUnidadNegocio(unidadNegocioRepository.getReferenceById(unidadId));
        }

        // Importante: acá NO se toca stock de ningún producto (tarea 6.4) — el pedido nace
        // PENDIENTE y sólo confirmarRecepcion() mueve inventario. Tampoco se llama a
        // ProductoService.crearProducto() acá (tarea 13.3): una línea "pendiente de crear" sólo
        // guarda nombre/precio, el Producto real recién nace en confirmarRecepcion() (tarea 13.6).
        for (PedidoDetalleDTO d : dto.getDetalles()) {
            pedido.addDetalle(construirDetalleDesdeDTO(d, unidadId));
        }

        Pedido guardado = pedidoRepository.save(pedido);
        return mapToDTO(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public PedidoDTO obtenerPorId(Long id) {
        return mapToDTO(buscarPedido(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PedidoDTO> listar(EstadoPedido estado, Long proveedorId, Pageable pageable) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        return pedidoRepository.buscar(unidadId, estado, proveedorId, pageable).map(this::mapToDTO);
    }

    @Override
    @Transactional
    public PedidoDTO actualizar(Long id, PedidoDTO dto) {
        Pedido pedido = buscarPedido(id);
        exigirPendiente(pedido, "editar");

        if (dto.getDetalles() == null || dto.getDetalles().isEmpty()) {
            throw new IllegalArgumentException("El pedido debe tener al menos un ítem.");
        }
        for (PedidoDetalleDTO d : dto.getDetalles()) {
            validarItemDetalle(d);
        }

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();

        if (dto.getProveedorId() != null) {
            pedido.setProveedor(buscarProveedor(dto.getProveedorId(), unidadId));
        }
        pedido.setObservaciones(dto.getObservaciones());

        // orphanRemoval = true en Pedido.detalles: reemplazar la lista borra los ítems viejos.
        pedido.getDetalles().clear();
        for (PedidoDetalleDTO d : dto.getDetalles()) {
            pedido.addDetalle(construirDetalleDesdeDTO(d, unidadId));
        }

        return mapToDTO(pedidoRepository.save(pedido));
    }

    @Override
    @Transactional
    public void cancelar(Long id) {
        Pedido pedido = buscarPedido(id);
        exigirPendiente(pedido, "cancelar");
        pedido.setEstado(EstadoPedido.CANCELADO);
        pedidoRepository.save(pedido);
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Pedido pedido = buscarPedido(id);
        exigirPendiente(pedido, "eliminar");
        pedido.setDeleted(true);
        pedidoRepository.save(pedido);
    }

    // ------------------------------------------------------------------
    // Confirmación de recepción — corazón del change (grupo 6 de tasks.md, extendido por el
    // grupo 13: creación diferida de producto nuevo, reemplaza la Decisión 3 original).
    //
    // Secuencia exacta acordada en el checkpoint de la tarea 6.5 (y confirmada de nuevo en 13.5
    // para la extensión de producto pendiente):
    //   1) Validar TODO primero, sin tocar nada (pedido, payload completo, cantidades válidas).
    //   2) Por cada ítem con cantidadRecibida > 0:
    //        2a) Si detalle.getProducto() == null (línea "pendiente de crear"): crear el
    //            Producto reutilizando ProductoService.crearProducto() (nombre/precio de la
    //            línea, stock=0, unidadNegocio = la del contexto activo — ya genera su propio
    //            AJUSTE_INICIAL) y enlazarlo con detalle.setProducto(...). Si cantidadRecibida
    //            es 0, esta línea NO se toca: no se crea Producto ni movimiento (tarea 13.7).
    //        2b) A partir de ahí, MISMO bloque de ingreso que para un producto existente, sin
    //            distinguir camino (tarea 13.6):
    //              producto.setStock(stock + recibida)
    //              movimientoStockService.registrarMovimiento(producto, recibida, INGRESO,
    //                                                           usuario, detalle.getCostoUnitarioPactado())
    //   3) Calcular el estado resultante (COMPLETO/PARCIAL) a partir de las cantidades reales.
    //   4) Setear fechaRecepcion.
    // Todo dentro de esta única transacción, sin REQUIRES_NEW ni flush() intermedio (tarea 13.8):
    // si falla la creación de un producto pendiente a mitad de la lista, se revierte TODO —
    // productos ya creados y stock ya sumado de líneas anteriores de esta misma confirmación
    // incluidos. Y SIN pasar por ProductoService.actualizarProducto() (tarea 6.9) ni tocar
    // costoProducto/precio (6.10).
    // ------------------------------------------------------------------
    @Override
    @Transactional
    public PedidoDTO confirmarRecepcion(Long id, RecepcionPedidoDTO recepcionDTO, String username) {
        Pedido pedido = buscarPedido(id);
        exigirPendiente(pedido, "confirmar la recepción de");

        List<PedidoDetalle> detalles = pedido.getDetalles();
        List<RecepcionItemDTO> items = recepcionDTO != null ? recepcionDTO.getItems() : null;
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("La confirmación debe incluir la cantidad recibida de cada ítem del pedido.");
        }

        // --- 1) Validación completa, ANTES de modificar nada ---
        Map<Long, Integer> cantidadPorDetalle = new HashMap<>();
        for (RecepcionItemDTO item : items) {
            if (item.getDetalleId() == null) {
                throw new IllegalArgumentException("Cada ítem de la confirmación debe indicar el detalleId.");
            }
            if (item.getCantidadRecibida() == null || item.getCantidadRecibida() < 0) {
                throw new IllegalArgumentException("La cantidad recibida debe ser un entero mayor o igual a cero.");
            }
            if (cantidadPorDetalle.put(item.getDetalleId(), item.getCantidadRecibida()) != null) {
                throw new IllegalArgumentException("El ítem " + item.getDetalleId() + " está repetido en la confirmación.");
            }
        }

        for (PedidoDetalle detalle : detalles) {
            if (!cantidadPorDetalle.containsKey(detalle.getId())) {
                throw new IllegalArgumentException("Faltan ítems en la confirmación: todos los ítems del pedido deben informarse.");
            }
        }
        if (cantidadPorDetalle.size() != detalles.size()) {
            throw new IllegalArgumentException("La confirmación incluye ítems que no pertenecen a este pedido.");
        }

        Usuario usuario = obtenerUsuario(username);

        // --- 2) Ingreso de stock: sólo ítems con cantidadRecibida > 0 generan movimiento ---
        boolean huboFaltante = false;
        for (PedidoDetalle detalle : detalles) {
            Integer recibida = cantidadPorDetalle.get(detalle.getId());
            detalle.setCantidadRecibida(recibida);

            if (recibida > 0) {
                // Línea "pendiente de crear" (tarea 13.6): el Producto real nace acá, recién
                // ahora que se sabe que efectivamente llegó algo. A partir de este punto no hay
                // distinción de camino con un producto existente — mismo bloque de ingreso abajo.
                if (detalle.getProducto() == null) {
                    ProductoDTO nuevoProductoDTO = new ProductoDTO();
                    nuevoProductoDTO.setNombre(detalle.getProductoNombreNuevo());
                    nuevoProductoDTO.setPrecio(detalle.getProductoPrecioNuevo());
                    nuevoProductoDTO.setStock(0);
                    ProductoDTO creado = productoService.crearProducto(nuevoProductoDTO);
                    Producto productoCreado = productoRepository.getReferenceById(creado.getId());
                    detalle.setProducto(productoCreado);
                }

                Producto producto = detalle.getProducto();
                int stockActual = producto.getStock() != null ? producto.getStock() : 0;
                producto.setStock(stockActual + recibida);
                productoRepository.save(producto);

                // Costo congelado en el movimiento = costoUnitarioPactado de ESTE ítem, no
                // producto.getCostoProducto() (Decisión 4 / Checkpoint grupo 5). NO se pasa por
                // ProductoService.actualizarProducto(): eso generaría un segundo movimiento con el
                // costo equivocado (tarea 6.9). Tampoco se toca costoProducto/precio (tarea 6.10).
                movimientoStockService.registrarMovimiento(
                        producto, recibida, TipoMovimientoStock.INGRESO, usuario, detalle.getCostoUnitarioPactado());
            }

            if (recibida < detalle.getCantidadPedida()) {
                huboFaltante = true;
            }
        }

        // --- 3) Estado resultante calculado por el servidor, nunca elegido por el payload ---
        pedido.setEstado(huboFaltante ? EstadoPedido.PARCIAL : EstadoPedido.COMPLETO);
        // --- 4) Fecha de recepción ---
        pedido.setFechaRecepcion(LocalDateTime.now());

        Pedido actualizado = pedidoRepository.save(pedido);
        return mapToDTO(actualizado);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private Pedido buscarPedido(Long id) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            return pedidoRepository.findByIdAndUnidadNegocioId(id, unidadId)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado o no pertenece a la unidad."));
        }
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado con id " + id));
    }

    private Proveedor buscarProveedor(Long proveedorId, Long unidadId) {
        if (unidadId != null) {
            return proveedorRepository.findByIdAndUnidadNegocioId(proveedorId, unidadId)
                    .orElseThrow(() -> new IllegalArgumentException("El proveedor no existe o no pertenece a la unidad activa."));
        }
        return proveedorRepository.findById(proveedorId)
                .orElseThrow(() -> new IllegalArgumentException("El proveedor no existe."));
    }

    // Validación de un ítem de pedido (crear/actualizar) — tarea 13.2: viene productoId O vienen
    // productoNombreNuevo + productoPrecioNuevo, nunca ambos ni ninguno. costoUnitarioPactado
    // sigue siendo obligatorio en todos los casos, como ya lo era antes del grupo 13.
    private void validarItemDetalle(PedidoDetalleDTO d) {
        if (d.getCantidadPedida() == null || d.getCantidadPedida() <= 0) {
            throw new IllegalArgumentException("La cantidad pedida de cada ítem debe ser mayor a cero.");
        }
        if (d.getCostoUnitarioPactado() == null || d.getCostoUnitarioPactado().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El costo unitario pactado de cada ítem es obligatorio y no puede ser negativo.");
        }

        boolean tieneProductoExistente = d.getProductoId() != null;
        boolean tieneNombreNuevo = d.getProductoNombreNuevo() != null && !d.getProductoNombreNuevo().isBlank();
        boolean tienePrecioNuevo = d.getProductoPrecioNuevo() != null;

        if (tieneProductoExistente && (tieneNombreNuevo || tienePrecioNuevo)) {
            throw new IllegalArgumentException(
                    "Un ítem no puede indicar productoId y datos de producto nuevo al mismo tiempo.");
        }
        if (!tieneProductoExistente) {
            if (!tieneNombreNuevo || !tienePrecioNuevo) {
                throw new IllegalArgumentException(
                        "Cada ítem debe indicar un producto existente (productoId) o el nombre y precio de venta de un producto nuevo.");
            }
            if (d.getProductoPrecioNuevo().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("El precio de venta del producto nuevo debe ser mayor a cero.");
            }
        }
    }

    // Arma el PedidoDetalle de un ítem ya validado: o enlaza un producto existente, o guarda los
    // datos mínimos de un producto "pendiente de crear" (tarea 13.2/13.4) — nunca ambos.
    private PedidoDetalle construirDetalleDesdeDTO(PedidoDetalleDTO d, Long unidadId) {
        PedidoDetalle detalle = new PedidoDetalle();
        if (d.getProductoId() != null) {
            detalle.setProducto(buscarProducto(d.getProductoId(), unidadId));
        } else {
            detalle.setProducto(null);
            detalle.setProductoNombreNuevo(d.getProductoNombreNuevo().trim());
            detalle.setProductoPrecioNuevo(d.getProductoPrecioNuevo());
        }
        detalle.setCantidadPedida(d.getCantidadPedida());
        detalle.setCostoUnitarioPactado(d.getCostoUnitarioPactado());
        detalle.setCantidadRecibida(null);
        return detalle;
    }

    private Producto buscarProducto(Long productoId, Long unidadId) {
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new IllegalArgumentException("El producto " + productoId + " no existe."));
        if (unidadId != null && producto.getUnidadNegocio() != null
                && !unidadId.equals(producto.getUnidadNegocio().getId())) {
            throw new IllegalArgumentException("El producto " + productoId + " no pertenece a la unidad activa.");
        }
        return producto;
    }

    private Usuario obtenerUsuario(String username) {
        if (username == null) {
            return null;
        }
        return usuarioRepository.findByUsername(username).orElse(null);
    }

    private void exigirPendiente(Pedido pedido, String accion) {
        if (pedido.getEstado() != EstadoPedido.PENDIENTE) {
            throw new IllegalStateException("No se puede " + accion + " un pedido en estado " + pedido.getEstado() + ".");
        }
    }

    private PedidoDTO mapToDTO(Pedido pedido) {
        List<PedidoDetalleDTO> detalles = pedido.getDetalles().stream()
                .map(this::mapDetalleToDTO)
                .collect(Collectors.toList());

        BigDecimal total = detalles.stream()
                .map(d -> d.getCostoUnitarioPactado() != null
                        ? d.getCostoUnitarioPactado().multiply(BigDecimal.valueOf(d.getCantidadPedida()))
                        : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return PedidoDTO.builder()
                .id(pedido.getId())
                .proveedorId(pedido.getProveedor() != null ? pedido.getProveedor().getId() : null)
                .proveedorNombre(pedido.getProveedor() != null ? pedido.getProveedor().getNombre() : null)
                .fechaCreacion(pedido.getFechaCreacion())
                .fechaRecepcion(pedido.getFechaRecepcion())
                .estado(pedido.getEstado())
                .usuarioNombre(pedido.getUsuario() != null ? pedido.getUsuario().getUsername() : null)
                .observaciones(pedido.getObservaciones())
                .detalles(detalles)
                .total(total)
                .build();
    }

    private PedidoDetalleDTO mapDetalleToDTO(PedidoDetalle detalle) {
        Integer pendiente = detalle.getCantidadRecibida() != null
                ? Math.max(0, detalle.getCantidadPedida() - detalle.getCantidadRecibida())
                : null;

        return PedidoDetalleDTO.builder()
                .id(detalle.getId())
                .productoId(detalle.getProducto() != null ? detalle.getProducto().getId() : null)
                .productoNombre(detalle.getProducto() != null ? detalle.getProducto().getNombre() : null)
                // Sólo tienen valor mientras producto es null (línea "pendiente de crear" —
                // tarea 13.4); una vez confirmada la recepción, producto deja de ser null y
                // estos campos vuelven a viajar en null (no se limpian en base, pero no se
                // exponen: el frontend ya tiene productoNombre para mostrar).
                .productoNombreNuevo(detalle.getProducto() == null ? detalle.getProductoNombreNuevo() : null)
                .productoPrecioNuevo(detalle.getProducto() == null ? detalle.getProductoPrecioNuevo() : null)
                .cantidadPedida(detalle.getCantidadPedida())
                .costoUnitarioPactado(detalle.getCostoUnitarioPactado())
                .cantidadRecibida(detalle.getCantidadRecibida())
                .cantidadPendiente(pendiente)
                .build();
    }
}
