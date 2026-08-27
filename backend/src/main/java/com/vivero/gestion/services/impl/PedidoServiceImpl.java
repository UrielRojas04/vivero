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
import com.vivero.gestion.models.MonedaCosto;
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
import com.vivero.gestion.dto.ProductoDescuentoDTO;
import java.util.ArrayList;

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
        validarMonedaLineas(dto, proveedor);

        Usuario usuario = obtenerUsuario(username);

        Pedido pedido = new Pedido();
        pedido.setProveedor(proveedor);
        pedido.setUsuario(usuario);
        pedido.setFechaCreacion(LocalDateTime.now());
        pedido.setEstado(EstadoPedido.PENDIENTE);
        pedido.setObservaciones(dto.getObservaciones());
        // Cotización del dólar de ESTE pedido (grupo 7, tarea 7.3 — Decisión 5/OQ2): se persiste
        // tal cual venga, aunque el pedido no tenga ninguna línea en USD (en ese caso simplemente
        // no se usa, el guard de CostoCalculator la ignora). Nunca se completa sola con la última
        // cotización conocida del proveedor: eso es sólo un prellenado del frontend (tarea 7.2).
        pedido.setCotizacionDolar(dto.getCotizacionDolar());

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
        validarMonedaLineas(dto, pedido.getProveedor());
        pedido.setObservaciones(dto.getObservaciones());
        // Misma regla que crear() (tarea 7.3): se pide en CADA edición del pedido, nunca se
        // conserva sola la cotización que ya tenía.
        pedido.setCotizacionDolar(dto.getCotizacionDolar());

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
    // para la extensión de producto pendiente; REVISADA el 2026-08-26, fuera de OpenSpec, ver
    // fix puntual más abajo en el cuerpo del método):
    //   1) Validar TODO primero, sin tocar nada (pedido, payload completo, cantidades válidas).
    //   2) Por cada ítem del pedido, SIN IMPORTAR cantidadRecibida:
    //        2a) Si detalle.getProducto() == null (línea "pendiente de crear"): crear SIEMPRE el
    //            Producto reutilizando ProductoService.crearProducto() (nombre/precio de la
    //            línea, stock=0, unidadNegocio = la del contexto activo — ya genera su propio
    //            AJUSTE_INICIAL de cantidad 0) y enlazarlo con detalle.setProducto(...). Esto pasa
    //            SIEMPRE para una línea pendiente, incluso con cantidadRecibida == 0 (el
    //            proveedor no mandó ese ítem): el producto igual nace en el catálogo, con
    //            stock 0 — antes (tarea 13.7 original) esta línea no se tocaba en absoluto si
    //            recibida era 0, lo que hacía que el Producto jamás naciera, en silencio.
    //   2b) SÓLO si cantidadRecibida > 0 (línea pendiente recién creada arriba, o línea de
    //       producto ya existente — mismo bloque de ingreso, sin distinguir camino, tarea 13.6):
    //              producto.setStock(stock + recibida)
    //              movimientoStockService.registrarMovimiento(producto, recibida, INGRESO,
    //                                                           usuario, detalle.getCostoUnitarioPactado())
    //       Si recibida == 0, este bloque NO corre para ninguna línea (pendiente o existente): no
    //       hay stock físico que respalde un MovimientoStock ni una CapaCostoStock.
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

        // Guard de moneda (tarea 7.4 — OQ2, el error más caro posible del change según el
        // usuario): si CUALQUIER línea que efectivamente recibe stock está pactada en USD y el
        // pedido no tiene cotización informada, se rechaza ACÁ, antes de tocar stock o generar
        // ningún movimiento — nunca se asume 1, nunca se recurre a
        // Proveedor.ultimaCotizacionConocida (que es sólo un prellenado del formulario, jamás un
        // fallback que el backend resuelva solo).
        boolean faltaCotizacion = detalles.stream().anyMatch(detalle ->
                cantidadPorDetalle.get(detalle.getId()) > 0
                        && detalle.getMonedaLinea() == MonedaCosto.USD
                        && pedido.getCotizacionDolar() == null);
        if (faltaCotizacion) {
            throw new IllegalArgumentException(
                    "El pedido tiene al menos una línea en dólares sin cotización informada. "
                            + "Cargá la cotización del pedido antes de confirmar la recepción.");
        }

        Usuario usuario = obtenerUsuario(username);

        // --- 2) Ingreso de stock: sólo ítems con cantidadRecibida > 0 generan movimiento ---
        boolean huboFaltante = false;
        for (PedidoDetalle detalle : detalles) {
            Integer recibida = cantidadPorDetalle.get(detalle.getId());
            detalle.setCantidadRecibida(recibida);

            // Fix puntual del 2026-08-26 (pedido explícito del usuario, fuera de OpenSpec): antes
            // esta creación vivía DENTRO del "if (recibida > 0)" de más abajo — si el proveedor no
            // mandó un ítem "pendiente de crear" y se confirmaba la recepción con cantidad 0 para
            // esa línea, el Producto NUNCA nacía, sin ningún error visible (fallaba en silencio:
            // el usuario esperaba ver el producto en el catálogo con stock 0 y no aparecía). Ahora
            // la creación de la FICHA del producto es incondicional para toda línea "pendiente"
            // (detalle.getProducto() == null), pase lo que pase con recibida — nace con stock=0
            // (nuevoProductoDTO.setStock(0) más abajo) — mientras que el INGRESO físico de stock
            // (bloque siguiente: producto.setStock(+recibida) + movimientoStockService + eventual
            // CapaCostoStock) se sigue disparando sólo si recibida > 0, sin cambios: si no llegó
            // nada, no hay stock físico que respalde un movimiento ni una capa de costo.
            if (detalle.getProducto() == null) {
                // Línea "pendiente de crear" (tarea 13.6): el Producto real nace acá, recién ahora
                // que se confirma la recepción (llegue o no llegue stock).
                //
                // Revisión puntual del 2026-08-20 (post-mortem de la Decisión original de la
                // misma fecha, fuera de OpenSpec): el usuario NO decide el precio de venta al
                // armar el pedido — eso sigue firme — pero dejar porcentajeGanancia en null
                // hacía que el producto naciera con precio == costo crudo (margen 0%), que el
                // usuario reportó como incorrecto ("el precio de venta no lo decido al hacer
                // el pedido, pero tampoco quiero que nazca sin margen"). Ahora nace con un %
                // de ganancia por defecto (30, ver Problema 4 de la tanda de fixes) para que
                // calcularPrecioSiAplica() (llamado dentro de crearProducto()) calcule el
                // precio real desde el arranque — costo × 1.30 con IVA/envío/descuentos ya
                // aplicados — en vez de dejarlo pegado al costo. setPrecio(...) de acá abajo
                // sigue siendo sólo el placeholder pre-cálculo (Producto.precio es NOT NULL en
                // la base): calcularPrecioSiAplica lo pisa apenas porcentajeGanancia > 0.
                //
                // Grupo 8 (tarea 8.6, Decisión 8 de design.md): el producto nace además con
                // los valores PACTADOS DE LA LÍNEA (iva/envío/descuento/moneda), NUNCA leyendo
                // el perfil del proveedor en ese momento — si el perfil del proveedor cambió
                // entre armar el pedido y confirmar la recepción, gana lo que quedó congelado
                // en la línea (tarea 8.11). ⚠️ ivaPactadoPorcentaje viaja tal cual (incluido 0
                // explícito cuando el proveedor tiene IVA incluido — tarea 8.2): nunca se
                // convierte a null, porque null heredaría el 21% de la unidad de negocio.
                ProductoDTO nuevoProductoDTO = new ProductoDTO();
                nuevoProductoDTO.setNombre(detalle.getProductoNombreNuevo());
                nuevoProductoDTO.setCostoProducto(detalle.getCostoUnitarioPactado());
                nuevoProductoDTO.setPrecio(detalle.getCostoUnitarioPactado());
                nuevoProductoDTO.setPorcentajeGanancia(ProductoServiceImpl.PORCENTAJE_GANANCIA_DEFECTO);
                nuevoProductoDTO.setStock(0);
                nuevoProductoDTO.setIvaPorcentaje(detalle.getIvaPactadoPorcentaje());
                nuevoProductoDTO.setCostoEnvioPorcentaje(detalle.getEnvioPactadoPorcentaje());
                nuevoProductoDTO.setMonedaCosto(detalle.getMonedaLinea());
                // Fix del 2026-08-26 (bug reportado por el usuario): antes se colapsaba todo a una
                // única entrada sintética "Proveedor", perdiendo los nombres reales de cada
                // descuento pactado. Ahora se parsea descuentoPactadoDetalle (mismo formato que ya
                // arma el frontend, "Nombre XX.XX%; Nombre2 YY.YY%") y el producto nace con sus
                // descuentos reales, separados por nombre — ver
                // ProductoServiceImpl.parsearDescuentosPactados(). Sin desglose textual disponible
                // (línea sin descuentos, o pedido de antes de que este campo existiera) el producto
                // nace con la lista de descuentos vacía, sin inventar ninguna entrada sintética.
                List<ProductoDescuentoDTO> descuentosIndividuales =
                        ProductoServiceImpl.parsearDescuentosPactados(detalle.getDescuentoPactadoDetalle());
                if (!descuentosIndividuales.isEmpty()) {
                    nuevoProductoDTO.setDescuentos(descuentosIndividuales);
                }
                // Grupo 9 (tarea 8.6/9.2): el producto nace con el proveedor DEL PEDIDO, ya
                // que Producto.proveedor existe. Puede ser null si el pedido no tiene
                // proveedor asignado (caso hoy inexistente en el flujo normal, pero sin
                // romper si pasara) — mismo criterio de nullability que el resto del campo.
                if (pedido.getProveedor() != null) {
                    nuevoProductoDTO.setProveedorId(pedido.getProveedor().getId());
                }
                ProductoDTO creado = productoService.crearProducto(nuevoProductoDTO);
                Producto productoCreado = productoRepository.getReferenceById(creado.getId());
                detalle.setProducto(productoCreado);
            }

            if (recibida > 0) {
                Producto producto = detalle.getProducto();
                int stockActual = producto.getStock() != null ? producto.getStock() : 0;
                producto.setStock(stockActual + recibida);
                productoRepository.save(producto);

                // Fix del 2026-08-26: el ajuste de ficha (costo/IVA/envío/descuento, sólo si el
                // costo FINAL completo de esta compra supera al final actual) ya NO se dispara acá
                // — se unificó en un único mecanismo (ProductoServiceImpl.actualizarFichaSiCostoFinalSupera)
                // que corre dentro de MovimientoStockServiceImpl.registrarMovimiento(), justo
                // después de crear la capa de costo de este mismo movimiento (mismo lugar donde
                // antes vivía sólo el ajuste de costo base). Los tres mecanismos viejos que vivían
                // acá por separado (costo/IVA-envío/descuento, cada uno con su propia condición de
                // disparo) se eliminaron: comparar cada pieza por separado era justamente el bug
                // reportado por el usuario (la combinación podía bajar el costo final real).

                // Costo congelado en el movimiento = costoUnitarioPactado de ESTE ítem, no
                // producto.getCostoProducto() (Decisión 4 / Checkpoint grupo 5). NO se pasa por
                // ProductoService.actualizarProducto(): eso generaría un segundo movimiento con el
                // costo equivocado (tarea 6.9). Tampoco se toca costoProducto/precio (tarea 6.10).
                // Moneda/cotización de ESTA línea (grupo 6/7): el guard "sólo convierte si USD"
                // vive en CostoCalculator — pasar monedaLinea=ARS o cotización=null para una línea
                // en pesos es inofensivo, el resultado congelado queda igual (identidad, tarea 6.7).
                // ivaPactadoPorcentaje/envioPactadoPorcentaje de ESTA línea (reapertura de la
                // Decisión 6 de arriba) ganan sobre la ficha del producto para ESTE movimiento —
                // null se comporta igual que siempre (fallback a la ficha). Mismo criterio ahora
                // para descuentoPactadoPorcentaje/Detalle (ampliación de hoy): gana sobre la
                // cascada de producto.getDescuentos() para ESTE movimiento congelado, para AMBOS
                // tipos de línea (existente y pendiente-recién-creada) — para una línea pendiente
                // esto reproduce exactamente el mismo resultado que antes (producto.descuentos ya
                // nació con esta misma entrada sintética "Proveedor" arriba, líneas 285-293).
                movimientoStockService.registrarMovimiento(
                        producto, recibida, TipoMovimientoStock.INGRESO, usuario, detalle.getCostoUnitarioPactado(),
                        detalle.getMonedaLinea(), pedido.getCotizacionDolar(),
                        detalle.getIvaPactadoPorcentaje(), detalle.getEnvioPactadoPorcentaje(),
                        detalle.getDescuentoPactadoPorcentaje(), detalle.getDescuentoPactadoDetalle());
            }

            if (recibida < detalle.getCantidadPedida()) {
                huboFaltante = true;
            }
        }

        // --- 3) Estado resultante calculado por el servidor, nunca elegido por el payload ---
        pedido.setEstado(huboFaltante ? EstadoPedido.PARCIAL : EstadoPedido.COMPLETO);
        // --- 4) Fecha de recepción ---
        pedido.setFechaRecepcion(LocalDateTime.now());

        // Único lugar donde se escriben Proveedor.ultimaCotizacionConocida/fechaUltimaCotizacion
        // (tarea 5.4/7 — OQ2): sólo ayuda de tipeo para el prellenado del próximo pedido, NUNCA
        // un fallback. Se actualiza al confirmar un pedido que efectivamente llevó cotización —
        // si el pedido no tenía ninguna línea en USD (cotizacionDolar == null), no se toca nada.
        if (pedido.getCotizacionDolar() != null && pedido.getProveedor() != null) {
            Proveedor proveedor = pedido.getProveedor();
            proveedor.setUltimaCotizacionConocida(pedido.getCotizacionDolar());
            proveedor.setFechaUltimaCotizacion(LocalDateTime.now());
            proveedorRepository.save(proveedor);
        }

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

    // Validación de un ítem de pedido (crear/actualizar) — tarea 13.2, ajustada por la Decisión
    // de la sesión del 2026-08-20: viene productoId O viene productoNombreNuevo, nunca ambos ni
    // ninguno. Ya NO se exige productoPrecioNuevo — el precio de venta no se pide al armar el
    // pedido (se calcula después, en Productos, a partir del costo). costoUnitarioPactado sigue
    // siendo obligatorio en todos los casos, como ya lo era antes del grupo 13.
    private void validarItemDetalle(PedidoDetalleDTO d) {
        if (d.getCantidadPedida() == null || d.getCantidadPedida() <= 0) {
            throw new IllegalArgumentException("La cantidad pedida de cada ítem debe ser mayor a cero.");
        }
        if (d.getCostoUnitarioPactado() == null || d.getCostoUnitarioPactado().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El costo unitario pactado de cada ítem es obligatorio y no puede ser negativo.");
        }

        boolean tieneProductoExistente = d.getProductoId() != null;
        boolean tieneNombreNuevo = d.getProductoNombreNuevo() != null && !d.getProductoNombreNuevo().isBlank();

        if (tieneProductoExistente && tieneNombreNuevo) {
            throw new IllegalArgumentException(
                    "Un ítem no puede indicar productoId y datos de producto nuevo al mismo tiempo.");
        }
        if (!tieneProductoExistente && !tieneNombreNuevo) {
            throw new IllegalArgumentException(
                    "Cada ítem debe indicar un producto existente (productoId) o el nombre de un producto nuevo.");
        }
    }

    // Guard de moneda a nivel de línea (tarea 7.1): una línea sólo puede pactarse en USD si el
    // proveedor del pedido efectivamente maneja dólares — defensa en profundidad además del
    // checkbox del frontend, que ya sólo se muestra si proveedor.manejaDolares = true.
    private void validarMonedaLineas(PedidoDTO dto, Proveedor proveedor) {
        boolean algunaEnUsd = dto.getDetalles().stream()
                .anyMatch(d -> d.getMonedaLinea() == MonedaCosto.USD);
        if (algunaEnUsd && (proveedor == null || !proveedor.isManejaDolares())) {
            throw new IllegalArgumentException(
                    "El proveedor seleccionado no maneja dólares: no se puede pactar ninguna línea en USD.");
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
            // productoPrecioNuevo ya no viaja desde el frontend (Decisión de la sesión del
            // 2026-08-20); esto sólo persiste lo que venga (normalmente null). Ver comentario
            // en confirmarRecepcion() y mapDetalleToDTO().
            detalle.setProductoPrecioNuevo(d.getProductoPrecioNuevo());
        }
        detalle.setCantidadPedida(d.getCantidadPedida());
        detalle.setCostoUnitarioPactado(d.getCostoUnitarioPactado());
        detalle.setCantidadRecibida(null);
        // Costeo pactado de la línea (grupo 7/8 de tasks.md, Decisión 8 de design.md): sin valor
        // por defecto ambiguo, mismo criterio que Producto.monedaCosto.
        detalle.setMonedaLinea(d.getMonedaLinea() != null ? d.getMonedaLinea() : MonedaCosto.ARS);
        detalle.setIvaPactadoPorcentaje(d.getIvaPactadoPorcentaje());
        detalle.setEnvioPactadoPorcentaje(d.getEnvioPactadoPorcentaje());
        detalle.setDescuentoPactadoPorcentaje(d.getDescuentoPactadoPorcentaje());
        detalle.setDescuentoPactadoDetalle(d.getDescuentoPactadoDetalle());
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

        // Fix puntual del 2026-08-20 (mismo defecto de fondo que el Problema 1 de la vista previa
        // del frontend en PedidoNuevo.jsx, encontrado acá al verificar en vivo): este total viaja
        // en el PedidoDTO y lo muestra Pedidos.jsx (lista de pedidos, antes y después de
        // confirmar la recepción) — sin esta conversión, una línea pactada en USD se sumaba cruda
        // como si fueran pesos, igual que el bug original del formulario. Cada línea en USD se
        // convierte por pedido.getCotizacionDolar() antes de sumar; sin cotización cargada (caso
        // hoy inalcanzable desde la UI, que la exige antes de guardar, pero sin garantía dura acá
        // en el service) la línea aporta 0 en vez de un ARS inventado.
        BigDecimal cotizacion = pedido.getCotizacionDolar();
        BigDecimal total = detalles.stream()
                .map(d -> {
                    if (d.getCostoUnitarioPactado() == null) {
                        return BigDecimal.ZERO;
                    }
                    BigDecimal costoUnitario = d.getCostoUnitarioPactado();
                    if (d.getMonedaLinea() == MonedaCosto.USD) {
                        costoUnitario = cotizacion != null ? costoUnitario.multiply(cotizacion) : BigDecimal.ZERO;
                    }
                    return costoUnitario.multiply(BigDecimal.valueOf(d.getCantidadPedida()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Proveedor puede haber sido dado de baja (soft delete, @SQLRestriction("deleted = false")
        // en Proveedor.java) DESPUÉS de haberse usado en este pedido: el proxy lazy de
        // pedido.getProveedor() no es null (la FK sigue apuntando a la fila), pero Hibernate lanza
        // EntityNotFoundException al intentar inicializarlo porque la restricción lo excluye. Sin
        // este guard, listar() completo se caía con un 500 por un único pedido con proveedor dado
        // de baja — mismo patrón ya usado para Cliente/Producto en VentaServiceImpl.mapearAVentaResponseDTO.
        Long proveedorId = null;
        String proveedorNombre = null;
        try {
            if (pedido.getProveedor() != null) {
                proveedorId = pedido.getProveedor().getId();
                proveedorNombre = pedido.getProveedor().getNombre();
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            proveedorNombre = "(eliminado)";
        }

        return PedidoDTO.builder()
                .id(pedido.getId())
                .proveedorId(proveedorId)
                .proveedorNombre(proveedorNombre)
                .fechaCreacion(pedido.getFechaCreacion())
                .fechaRecepcion(pedido.getFechaRecepcion())
                .estado(pedido.getEstado())
                .usuarioNombre(pedido.getUsuario() != null ? pedido.getUsuario().getUsername() : null)
                .observaciones(pedido.getObservaciones())
                .detalles(detalles)
                .total(total)
                .cotizacionDolar(pedido.getCotizacionDolar())
                .build();
    }

    private PedidoDetalleDTO mapDetalleToDTO(PedidoDetalle detalle) {
        Integer pendiente = detalle.getCantidadRecibida() != null
                ? Math.max(0, detalle.getCantidadPedida() - detalle.getCantidadRecibida())
                : null;

        // Mismo guard que el proveedor de mapToDTO: el producto de esta línea puede haber sido
        // dado de baja (soft delete, @SQLRestriction en Producto.java) después de confirmarse la
        // recepción. detalle.getProducto() devuelve un proxy no-nulo (la FK sigue existiendo),
        // pero inicializarlo (getNombre()) dispara EntityNotFoundException porque la restricción
        // "deleted = false" no encuentra la fila — sin este guard, un único producto eliminado
        // tumbaba el listado ENTERO de pedidos con un 500.
        boolean tieneProducto = detalle.getProducto() != null;
        Long productoId = null;
        String productoNombre = null;
        try {
            if (tieneProducto) {
                productoId = detalle.getProducto().getId();
                productoNombre = detalle.getProducto().getNombre();
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            productoNombre = "(eliminado)";
        }

        return PedidoDetalleDTO.builder()
                .id(detalle.getId())
                .productoId(productoId)
                .productoNombre(productoNombre)
                // Sólo tiene valor mientras producto es null (línea "pendiente de crear" —
                // tarea 13.4); una vez confirmada la recepción, producto deja de ser null y
                // vuelve a viajar en null (no se limpia en base, pero no se expone: el frontend
                // ya tiene productoNombre para mostrar).
                // productoPrecioNuevo ya NO se expone (Decisión de la sesión del 2026-08-20): el
                // precio de venta no se pide más al armar el pedido, el campo quedó sin uso
                // funcional (la columna de base se deja, mismo criterio que descuentoProveedor).
                .productoNombreNuevo(!tieneProducto ? detalle.getProductoNombreNuevo() : null)
                .cantidadPedida(detalle.getCantidadPedida())
                .costoUnitarioPactado(detalle.getCostoUnitarioPactado())
                .cantidadRecibida(detalle.getCantidadRecibida())
                .cantidadPendiente(pendiente)
                .monedaLinea(detalle.getMonedaLinea())
                .ivaPactadoPorcentaje(detalle.getIvaPactadoPorcentaje())
                .envioPactadoPorcentaje(detalle.getEnvioPactadoPorcentaje())
                .descuentoPactadoPorcentaje(detalle.getDescuentoPactadoPorcentaje())
                .descuentoPactadoDetalle(detalle.getDescuentoPactadoDetalle())
                .build();
    }
}
