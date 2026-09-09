package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.EntregaPendienteConfirmarLineaDTO;
import com.vivero.gestion.dto.EntregaPendienteConfirmarRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteDetalleRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteDetalleResponseDTO;
import com.vivero.gestion.dto.EntregaPendienteFirmaDTO;
import com.vivero.gestion.dto.EntregaPendienteRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteResponseDTO;
import com.vivero.gestion.dto.EntregaPendienteResumenDTO;
import com.vivero.gestion.dto.StockUpdateEvent;
import com.vivero.gestion.dto.VentaDetalleRequestDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.exceptions.ResourceNotFoundException;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EntregaPendiente;
import com.vivero.gestion.models.EntregaPendienteDetalle;
import com.vivero.gestion.models.EstadoEntregaPendiente;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.EntregaPendienteRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.EntregaPendienteService;
import com.vivero.gestion.services.MovimientoStockService;
import com.vivero.gestion.services.SseService;
import com.vivero.gestion.services.VentaService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Change entregas-pendientes-confirmacion-vivero. Grupo 6 de tasks.md (D5, D7, D9 de design.md).
 */
@Service
public class EntregaPendienteServiceImpl implements EntregaPendienteService {

    private static final String PREFIJO_FIRMA_VALIDO = "data:image/png;base64,";
    private static final int TOPE_FIRMA_CARACTERES = 512 * 1024;

    private final EntregaPendienteRepository entregaPendienteRepository;
    private final ClienteRepository clienteRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final MovimientoStockService movimientoStockService;
    private final SseService sseService;
    private final VentaService ventaService;
    private final VentaRepository ventaRepository;

    public EntregaPendienteServiceImpl(EntregaPendienteRepository entregaPendienteRepository,
                                        ClienteRepository clienteRepository,
                                        ProductoRepository productoRepository,
                                        UsuarioRepository usuarioRepository,
                                        UnidadNegocioRepository unidadNegocioRepository,
                                        MovimientoStockService movimientoStockService,
                                        SseService sseService,
                                        VentaService ventaService,
                                        VentaRepository ventaRepository) {
        this.entregaPendienteRepository = entregaPendienteRepository;
        this.clienteRepository = clienteRepository;
        this.productoRepository = productoRepository;
        this.usuarioRepository = usuarioRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.movimientoStockService = movimientoStockService;
        this.sseService = sseService;
        this.ventaService = ventaService;
        this.ventaRepository = ventaRepository;
    }

    @Override
    @Transactional
    public EntregaPendienteResponseDTO registrar(EntregaPendienteRequestDTO request, String username) {
        UnidadNegocio vivero = exigirUnidadVivero();

        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        validarFirma(request.getFirmaBase64());

        if (request.getClienteId() == null) {
            throw new IllegalArgumentException("Debe indicar un cliente de la agenda (no se admite cliente casual)");
        }
        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        if (request.getDetalles() == null || request.getDetalles().isEmpty()) {
            throw new IllegalArgumentException("La entrega debe tener al menos una línea");
        }

        EntregaPendiente entrega = new EntregaPendiente();
        entrega.setCliente(cliente);
        entrega.setUsuarioRegistro(usuario);
        entrega.setUnidadNegocio(vivero);
        entrega.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        entrega.setEstado(EstadoEntregaPendiente.PENDIENTE);
        entrega.setFirmaBase64(request.getFirmaBase64());
        entrega.setObservacion(request.getObservacion());

        for (EntregaPendienteDetalleRequestDTO detReq : request.getDetalles()) {
            if (detReq.getCantidad() == null || detReq.getCantidad() <= 0) {
                throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
            }
            Producto producto = productoRepository.findById(detReq.getProductoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + detReq.getProductoId()));

            int stockActual = producto.getStock() == null ? 0 : producto.getStock();
            if (detReq.getCantidad() > stockActual) {
                throw new IllegalArgumentException("No hay stock suficiente para el producto: " + producto.getNombre());
            }
            producto.setStock(stockActual - detReq.getCantidad());
            productoRepository.save(producto);
            sseService.emitStockUpdate(new StockUpdateEvent(producto.getId(), producto.getStock()));

            MovimientoStock mov = movimientoStockService.registrarMovimiento(
                    producto, detReq.getCantidad(), TipoMovimientoStock.ENTREGA_PENDIENTE, usuario);

            EntregaPendienteDetalle detalle = new EntregaPendienteDetalle();
            detalle.setProducto(producto);
            detalle.setCantidad(detReq.getCantidad());
            detalle.setMovimientoStock(mov);
            entrega.addDetalle(detalle);
        }

        EntregaPendiente guardada = entregaPendienteRepository.save(entrega);
        return mapearAResponseDTO(guardada);
    }

    @Override
    @Transactional(readOnly = true)
    public EntregaPendienteFirmaDTO obtenerFirma(Long id) {
        exigirUnidadVivero();
        // findById() (find-by-id genérico de Spring Data) NO sirve acá: para una asociación EAGER
        // con @NotFound(IGNORE), Hibernate 6.6 arma un INNER JOIN contra clientes en el load-plan
        // por defecto -- si el cliente está soft-eliminado, ese INNER JOIN elimina la fila entera
        // de entregas_pendientes de la consulta, y la entrega "desaparece" (404 falso) aunque
        // exista. findByIdWithDetalles es una consulta HQL explícita que NO arma ese join
        // implícito (carga cliente en una select aparte, respetando NotFound.IGNORE de verdad) --
        // mismo motivo por el que obtenerPorId/confirmar/rechazar ya la usan.
        EntregaPendiente entrega = entregaPendienteRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega no encontrada"));
        return new EntregaPendienteFirmaDTO(entrega.getFirmaBase64());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EntregaPendienteResumenDTO> listarPorEstado(EstadoEntregaPendiente estado, Pageable pageable) {
        UnidadNegocio vivero = exigirUnidadVivero();
        return entregaPendienteRepository
                .findByUnidadNegocioIdAndEstadoOptional(vivero.getId(), estado, pageable)
                .map(this::mapearAResumenDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EntregaPendienteResumenDTO> listarMias(String username, Pageable pageable) {
        UnidadNegocio vivero = exigirUnidadVivero();
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        return entregaPendienteRepository
                .findByUnidadNegocioIdAndUsuarioRegistroIdOrderByFechaDesc(vivero.getId(), usuario.getId(), pageable)
                .map(this::mapearAResumenDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public EntregaPendienteResponseDTO obtenerPorId(Long id) {
        exigirUnidadVivero();
        EntregaPendiente entrega = entregaPendienteRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega no encontrada"));
        return mapearAResponseDTO(entrega);
    }

    // Grupo 9 de tasks.md (D3, D4, D11 de design.md): confirmar arma un VentaRequestDTO con el
    // precio por línea que trae el request y lo pasa a crearVentaConStockYaDescontado junto con
    // los MovimientoStock ya congelados de cada detalle -- NUNCA vuelve a tocar stock. Si la
    // creación de la venta lanza, el @Transactional de este método revierte todo (la entrega
    // queda igual que antes: PENDIENTE, sin venta) -- no hace falta un catch acá.
    @Override
    @Transactional
    public VentaResponseDTO confirmar(Long id, EntregaPendienteConfirmarRequestDTO request, String username) {
        exigirUnidadVivero();

        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        EntregaPendiente entrega = entregaPendienteRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega no encontrada"));

        if (entrega.getEstado() != EstadoEntregaPendiente.PENDIENTE) {
            throw new IllegalStateException("La entrega ya fue resuelta (estado " + entrega.getEstado() + ")");
        }

        List<EntregaPendienteDetalle> detalles = entrega.getDetalles();

        // Exactamente un precio por línea, identificada por detalleId (Decisión 13 de design.md):
        // ni de menos ni de más. Precio null explícito se rechaza acá mismo -- no se lo deja caer
        // al fallback de "precio de lista" de resolverPrecioUnitario, porque acá "faltó el precio"
        // es un error de negocio, no un valor por defecto válido.
        Map<Long, BigDecimal> preciosPorDetalleId = new HashMap<>();
        List<EntregaPendienteConfirmarLineaDTO> lineas = request.getLineas();
        if (lineas != null) {
            for (EntregaPendienteConfirmarLineaDTO linea : lineas) {
                if (linea.getDetalleId() == null) {
                    throw new IllegalArgumentException("Cada línea de precio debe indicar detalleId");
                }
                if (linea.getPrecioUnitario() == null) {
                    throw new IllegalArgumentException(
                            "Debe indicar un precio para la línea " + linea.getDetalleId() + " (0 es válido, pero no puede faltar)");
                }
                if (preciosPorDetalleId.putIfAbsent(linea.getDetalleId(), linea.getPrecioUnitario()) != null) {
                    throw new IllegalArgumentException("Precio duplicado para la línea " + linea.getDetalleId());
                }
            }
        }
        if (preciosPorDetalleId.size() != detalles.size()) {
            throw new IllegalArgumentException(
                    "Debe indicar exactamente un precio por cada línea de la entrega, ni de más ni de menos");
        }

        // El cliente o el producto de alguna línea puede haber sido dado de baja (soft delete)
        // después de registrarse la entrega -- a diferencia del listado (donde mostramos
        // "(eliminado)" y seguimos), acá es un bloqueo real: no se puede crear una Venta con un
        // clienteId/productoId que ya no resuelve (VentaServiceImpl.crearVenta tampoco lo
        // permitiría). Cliente/Producto usan @NotFound(IGNORE) (ver esas entidades), así que la
        // referencia da null en vez de tirar -- se avisa con un mensaje claro para que el dueño
        // rechace la entrega en su lugar.
        if (entrega.getCliente() == null) {
            throw new IllegalStateException(
                    "No se puede confirmar: el cliente de esta entrega fue eliminado. Rechazá la entrega en su lugar.");
        }
        Long clienteId = entrega.getCliente().getId();

        VentaRequestDTO ventaRequest = new VentaRequestDTO();
        ventaRequest.setClienteId(clienteId);
        ventaRequest.setPorcentajeDescuento(request.getPorcentajeDescuento());
        ventaRequest.setPagos(request.getPagos());

        List<VentaDetalleRequestDTO> ventaDetalles = new ArrayList<>();
        List<MovimientoStock> movimientosPorLinea = new ArrayList<>();
        for (EntregaPendienteDetalle detalle : detalles) {
            if (!preciosPorDetalleId.containsKey(detalle.getId())) {
                // El precio recibido no cubre esta línea -- o sobró un detalleId ajeno a la
                // entrega, o faltó éste. En ambos casos es "precio faltante para una línea".
                throw new IllegalArgumentException("Falta el precio para la línea " + detalle.getId());
            }
            if (detalle.getProducto() == null) {
                throw new IllegalStateException(
                        "No se puede confirmar: un producto de esta entrega fue eliminado. Rechazá la entrega en su lugar.");
            }
            Long productoId = detalle.getProducto().getId();
            VentaDetalleRequestDTO ventaDetalle = new VentaDetalleRequestDTO();
            ventaDetalle.setProductoId(productoId);
            ventaDetalle.setCantidad(detalle.getCantidad());
            ventaDetalle.setPrecioUnitario(preciosPorDetalleId.get(detalle.getId()));
            ventaDetalles.add(ventaDetalle);
            movimientosPorLinea.add(detalle.getMovimientoStock());
        }
        ventaRequest.setDetalles(ventaDetalles);

        // El usuario que confirma es el usuario de la Venta y de la fecha de creación (Decisión
        // 11): es quien fija precio y cierra la operación, no el empleado que la registró.
        VentaResponseDTO ventaResponse = ventaService.crearVentaConStockYaDescontado(
                ventaRequest, username, movimientosPorLinea);

        Venta venta = ventaRepository.findById(ventaResponse.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Venta creada no encontrada"));

        entrega.setEstado(EstadoEntregaPendiente.CONFIRMADA);
        entrega.setVenta(venta);
        entrega.setUsuarioResolucion(usuario);
        entrega.setFechaResolucion(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        entregaPendienteRepository.save(entrega);

        return ventaResponse;
    }

    // Grupo 10 de tasks.md (Decisión 2 de design.md): rechazar repone el stock de cada línea con
    // un MovimientoStock REVERSA_ENTREGA_PENDIENTE -- nunca INGRESO (contaminaría la referencia de
    // costo de egresos futuros, ver Decisión 1) -- y NO crea ninguna Venta.
    @Override
    @Transactional
    public EntregaPendienteResponseDTO rechazar(Long id, String motivo, String username) {
        exigirUnidadVivero();

        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        EntregaPendiente entrega = entregaPendienteRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega no encontrada"));

        if (entrega.getEstado() != EstadoEntregaPendiente.PENDIENTE) {
            throw new IllegalStateException("La entrega ya fue resuelta (estado " + entrega.getEstado() + ")");
        }

        for (EntregaPendienteDetalle detalle : entrega.getDetalles()) {
            // A diferencia de confirmar() (donde un producto eliminado bloquea la operación
            // porque haría falta para crear la Venta), rechazar es la vía de recuperación de una
            // entrega trabada -- SIEMPRE tiene que poder resolverse. Si el producto de esta línea
            // fue dado de baja (soft delete, @NotFound(IGNORE) en EntregaPendienteDetalle.producto)
            // después de registrarse la entrega, no hay a quién reponerle el stock: se omite esa
            // línea puntual y se sigue con el resto, la entrega igual queda RECHAZADA.
            Producto producto = detalle.getProducto();
            if (producto == null) {
                continue;
            }

            int stockActual = producto.getStock() == null ? 0 : producto.getStock();
            producto.setStock(stockActual + detalle.getCantidad());
            productoRepository.save(producto);
            sseService.emitStockUpdate(new StockUpdateEvent(producto.getId(), producto.getStock()));

            // Sólo suma: reponer no puede fallar por insuficiencia (Decisión 2 de design.md).
            movimientoStockService.registrarMovimiento(
                    producto, detalle.getCantidad(), TipoMovimientoStock.REVERSA_ENTREGA_PENDIENTE, usuario);
        }

        entrega.setEstado(EstadoEntregaPendiente.RECHAZADA);
        entrega.setMotivoRechazo(motivo);
        entrega.setUsuarioResolucion(usuario);
        entrega.setFechaResolucion(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        EntregaPendiente guardada = entregaPendienteRepository.save(entrega);

        return mapearAResponseDTO(guardada);
    }

    // Guard Vivero-only (Decisión 9 de design.md): TODO método público empieza acá. No alcanza con
    // esconder el ítem del menú -- un usuario con el permiso pero en otra unidad podría llamar la
    // API directo.
    private UnidadNegocio exigirUnidadVivero() {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        UnidadNegocio unidad = unidadId != null ? unidadNegocioRepository.findById(unidadId).orElse(null) : null;
        if (unidad == null || !"Vivero".equals(unidad.getNombre())) {
            throw new IllegalStateException("Las entregas pendientes son exclusivas de la unidad Vivero");
        }
        return unidad;
    }

    // Validación de firma (Decisión 5 de design.md), extraída a su propio método (tarea 6.10
    // REFACTOR): debe empezar con el prefijo PNG exacto, no estar en blanco, y no superar el tope
    // de longitud -- frena abuso o un envío accidental de una foto sin ser una firma de canvas.
    private void validarFirma(String firmaBase64) {
        if (firmaBase64 == null || firmaBase64.isBlank()) {
            throw new IllegalArgumentException("La firma del cliente es obligatoria");
        }
        if (!firmaBase64.startsWith(PREFIJO_FIRMA_VALIDO)) {
            throw new IllegalArgumentException("La firma debe ser una imagen PNG (data:image/png;base64,...)");
        }
        if (firmaBase64.length() > TOPE_FIRMA_CARACTERES) {
            throw new IllegalArgumentException("La firma supera el tamaño máximo permitido (512 KB)");
        }
    }

    // Proyección de listado (Decisión 6 de design.md): NUNCA incluye la firma -- ni siquiera se
    // toca entrega.getFirmaBase64() acá.
    //
    // Guard de cliente eliminado: mismo patrón que VentaServiceImpl.mapearAVentaResponseDTO /
    // PedidoServiceImpl.mapToDTO. El cliente puede haber sido dado de baja (soft delete,
    // @SQLRestriction("deleted = false") en Cliente.java) DESPUÉS de registrarse la entrega -- el
    // proxy lazy de entrega.getCliente() no es null (la FK sigue apuntando a la fila), pero
    // Hibernate lanza EntityNotFoundException al inicializarlo porque la restricción lo excluye.
    // Sin este guard, listar()/listarMias() completos se caían con un 500 por una única entrega
    // con cliente dado de baja.
    private EntregaPendienteResumenDTO mapearAResumenDTO(EntregaPendiente entrega) {
        int cantidadLineas = entrega.getDetalles() != null ? entrega.getDetalles().size() : 0;
        int cantidadTotalUnidades = entrega.getDetalles() == null ? 0 : entrega.getDetalles().stream()
                .mapToInt(d -> d.getCantidad() != null ? d.getCantidad() : 0)
                .sum();
        Long clienteId = null;
        String clienteNombre = "(eliminado)";
        try {
            if (entrega.getCliente() != null) {
                clienteId = entrega.getCliente().getId();
                clienteNombre = entrega.getCliente().getNombreRazonSocial();
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            clienteNombre = "(eliminado)";
        }
        return new EntregaPendienteResumenDTO(
                entrega.getId(),
                entrega.getFecha(),
                clienteId,
                clienteNombre,
                entrega.getUsuarioRegistro() != null ? entrega.getUsuarioRegistro().getUsername() : "(eliminado)",
                entrega.getEstado(),
                cantidadLineas,
                cantidadTotalUnidades);
    }

    private EntregaPendienteResponseDTO mapearAResponseDTO(EntregaPendiente entrega) {
        EntregaPendienteResponseDTO dto = new EntregaPendienteResponseDTO();
        dto.setId(entrega.getId());
        dto.setFecha(entrega.getFecha());
        dto.setClienteNombre("(eliminado)");
        try {
            if (entrega.getCliente() != null) {
                dto.setClienteId(entrega.getCliente().getId());
                dto.setClienteNombre(entrega.getCliente().getNombreRazonSocial());
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            dto.setClienteNombre("(eliminado)");
        }
        if (entrega.getUsuarioRegistro() != null) {
            dto.setUsuarioRegistroId(entrega.getUsuarioRegistro().getId());
            dto.setUsuarioRegistroNombre(entrega.getUsuarioRegistro().getUsername());
        }
        dto.setEstado(entrega.getEstado());
        dto.setObservacion(entrega.getObservacion());

        // Mismo guard para el producto de cada línea (soft delete en Producto.java).
        List<EntregaPendienteDetalleResponseDTO> detallesDto = new ArrayList<>();
        if (entrega.getDetalles() != null) {
            for (EntregaPendienteDetalle d : entrega.getDetalles()) {
                Long productoId = null;
                String productoNombre = "(eliminado)";
                BigDecimal precioLista = null;
                try {
                    Producto producto = d.getProducto();
                    if (producto != null) {
                        productoId = producto.getId();
                        productoNombre = producto.getNombre();
                        precioLista = producto.getPrecio();
                    }
                } catch (jakarta.persistence.EntityNotFoundException e) {
                    productoNombre = "(eliminado)";
                }
                detallesDto.add(new EntregaPendienteDetalleResponseDTO(
                        d.getId(), productoId, productoNombre, d.getCantidad(), precioLista));
            }
        }
        dto.setDetalles(detallesDto);

        if (entrega.getVenta() != null) {
            dto.setVentaId(entrega.getVenta().getId());
        }
        if (entrega.getUsuarioResolucion() != null) {
            dto.setUsuarioResolucionId(entrega.getUsuarioResolucion().getId());
            dto.setUsuarioResolucionNombre(entrega.getUsuarioResolucion().getUsername());
        }
        dto.setFechaResolucion(entrega.getFechaResolucion());
        dto.setMotivoRechazo(entrega.getMotivoRechazo());
        return dto;
    }
}
