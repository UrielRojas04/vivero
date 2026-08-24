package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.dto.ProductoDescuentoDTO;
import com.vivero.gestion.dto.RevisionCostoProductoDTO;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.ProductoDescuento;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.RevisionCostoProjection;
import com.vivero.gestion.services.CostoCalculator;
import com.vivero.gestion.services.ProductoService;
import com.vivero.gestion.services.SseService;
import com.vivero.gestion.services.MovimientoStockService;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.ProveedorRepository;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Proveedor;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ProductoServiceImpl implements ProductoService {

    private static final Logger log = LoggerFactory.getLogger(ProductoServiceImpl.class);

    // Panel de revisión de costos (Decisión 10 de design.md de revision-costos-productos): LIMIT
    // explícito (regla dura 6, nada sin límite), no paginado. Con 11 productos en Herramientas no
    // se roza ni de lejos; existe para que el panel no pueda degradarse si el catálogo crece.
    private static final int LIMITE_REVISION_COSTOS = 50;

    // Tanda de fixes puntuales del 2026-08-20 (Problema 4, pedido explícito del usuario, aplica a
    // TODOS los productos de ambos negocios): cualquier producto nuevo nace con 30% de ganancia
    // por defecto en vez de quedar en null/vacío — así el precio sale calculado (costo × 1.30, con
    // IVA/envío/descuentos ya aplicados vía calcularPrecioSiAplica) desde el arranque, nunca
    // pegado al costo crudo. Sólo se aplica cuando el DTO NO trae el campo informado (null):
    // nunca pisa un valor real que haya venido explícito, incluido 0.
    static final BigDecimal PORCENTAJE_GANANCIA_DEFECTO = new BigDecimal("30");

    private final ProductoRepository productoRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final SseService sseService;
    private final MovimientoStockService movimientoStockService;
    private final UsuarioRepository usuarioRepository;
    // Sólo para resolver Producto.proveedor (Decisión 2 — grupo 9). No confundir con un fallback
    // de costeo: este service NUNCA lee el perfil de costeo del proveedor (Decisión 3, verificado
    // por el grep de la tarea 8.10/12.11) — únicamente resuelve el vínculo de catálogo por id.
    // MarcaRepository ya no se inyecta acá (tarea 9.10): ninguna ruta de alta/edición de producto
    // vuelve a llamar setMarca(), Marca.java/MarcaRepository quedan intactos como red de rollback.
    private final ProveedorRepository proveedorRepository;

    @Autowired
    public ProductoServiceImpl(ProductoRepository productoRepository,
                               UnidadNegocioRepository unidadNegocioRepository,
                               SseService sseService,
                               MovimientoStockService movimientoStockService,
                               UsuarioRepository usuarioRepository,
                               ProveedorRepository proveedorRepository) {
        this.productoRepository = productoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.sseService = sseService;
        this.movimientoStockService = movimientoStockService;
        this.usuarioRepository = usuarioRepository;
        this.proveedorRepository = proveedorRepository;
    }

    @Override
    @Transactional
    public ProductoDTO crearProducto(ProductoDTO dto) {
        validarProducto(dto);

        Producto producto = new Producto();
        producto.setNombre(dto.getNombre());
        producto.setDescripcion(dto.getDescripcion());
        producto.setPrecio(dto.getPrecio());

        // Vínculo de catálogo: proveedor, no marca (Decisión 2 — grupo 9, tarea 9.2/9.10).
        // `marca`/`marca_id` quedan intactos como red de rollback, sin escribirse desde acá.
        if (dto.getProveedorId() != null) {
            Proveedor proveedor = proveedorRepository.findById(dto.getProveedorId()).orElse(null);
            producto.setProveedor(proveedor);
        } else {
            producto.setProveedor(null);
        }
        producto.setCostoProducto(dto.getCostoProducto());
        producto.setDescuentoProveedor(dto.getDescuentoProveedor() != null ? dto.getDescuentoProveedor() : java.math.BigDecimal.ZERO);
        // Default 30% (Problema 4): sólo cuando el DTO no informa el campo (null). Un 0 explícito
        // (alguien que a propósito quiera margen cero) viaja tal cual, nunca se pisa.
        producto.setPorcentajeGanancia(dto.getPorcentajeGanancia() != null ? dto.getPorcentajeGanancia() : PORCENTAJE_GANANCIA_DEFECTO);
        producto.setStock(dto.getStock() != null ? dto.getStock() : 0);
        producto.setLote(dto.getLote());
        producto.setNumeroSiembra(dto.getNumeroSiembra());
        producto.setDueno(dto.getDueno());
        // ivaPorcentaje/costoEnvioPorcentaje se asignan tal cual vienen del DTO: si el campo no
        // vino informado, dto.getX() ya es null y eso es exactamente lo que se persiste — nunca
        // se convierte a ZERO (Decisión 5, tarea 7.5).
        producto.setIvaPorcentaje(dto.getIvaPorcentaje());
        producto.setCostoEnvioPorcentaje(dto.getCostoEnvioPorcentaje());
        // Sin valor por defecto ambiguo (tarea 5.1): si el DTO no trae moneda, ARS explícito.
        producto.setMonedaCosto(dto.getMonedaCosto() != null ? dto.getMonedaCosto() : com.vivero.gestion.models.MonedaCosto.ARS);

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            UnidadNegocio unidad = unidadNegocioRepository.findById(unidadId).orElse(null);
            producto.setUnidadNegocio(unidad);
        }

        reemplazarDescuentos(producto, dto.getDescuentos());

        calcularPrecioSiAplica(producto);

        Producto guardado = productoRepository.save(producto);
        
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.vivero.gestion.models.Usuario usuario = null;
        if (username != null && !username.equals("anonymousUser")) {
            usuario = usuarioRepository.findByUsername(username).orElse(null);
        }
        movimientoStockService.registrarMovimiento(guardado, guardado.getStock() != null ? guardado.getStock() : 0, TipoMovimientoStock.AJUSTE_INICIAL, usuario);
        
        sseService.emitStockUpdate(new com.vivero.gestion.dto.StockUpdateEvent(guardado.getId(), guardado.getStock()));
        return mapToDTO(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductoDTO obtenerProductoPorId(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        return mapToDTO(producto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductoDTO> obtenerTodosLosProductos() {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<Producto> productos = (unidadId != null) 
            ? productoRepository.findAllByUnidadNegocioId(unidadId) 
            : productoRepository.findAll();

        return productos.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProductoDTO actualizarProducto(Long id, ProductoDTO dto) {
        validarProducto(dto);

        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        boolean stockChanged = dto.getStock() != null && !dto.getStock().equals(producto.getStock());
        boolean costChanged = dto.getCostoProducto() != null && !dto.getCostoProducto().equals(producto.getCostoProducto());
        boolean discountChanged = dto.getDescuentoProveedor() != null && !dto.getDescuentoProveedor().equals(producto.getDescuentoProveedor());
        // Extensión de la detección de cambios (Decisión 9, tarea 7.3): IVA propio, envío propio
        // y cualquier alta/baja/modificación real de una fila de la lista de descuentos también
        // tienen que generar un MovimientoStock nuevo — son componentes del costo igual que
        // costoProducto o descuentoProveedor.
        boolean ivaPropioChanged = bigDecimalChanged(dto.getIvaPorcentaje(), producto.getIvaPorcentaje());
        boolean envioPropioChanged = bigDecimalChanged(dto.getCostoEnvioPorcentaje(), producto.getCostoEnvioPorcentaje());
        boolean descuentosChanged = descuentosCambiaron(producto.getDescuentos(), dto.getDescuentos());

        producto.setNombre(dto.getNombre());
        producto.setDescripcion(dto.getDescripcion());
        producto.setPrecio(dto.getPrecio());

        // Vínculo de catálogo: proveedor, no marca (Decisión 2 — grupo 9, tarea 9.2/9.10).
        if (dto.getProveedorId() != null) {
            Proveedor proveedor = proveedorRepository.findById(dto.getProveedorId()).orElse(null);
            producto.setProveedor(proveedor);
        } else {
            producto.setProveedor(null);
        }
        if (dto.getCostoProducto() != null) producto.setCostoProducto(dto.getCostoProducto());
        if (dto.getDescuentoProveedor() != null) producto.setDescuentoProveedor(dto.getDescuentoProveedor());
        if (dto.getPorcentajeGanancia() != null) producto.setPorcentajeGanancia(dto.getPorcentajeGanancia());
        // ivaPorcentaje/costoEnvioPorcentaje se pisan siempre con lo que trae el DTO, incluido
        // null: vaciar el campo en el formulario tiene que volver a "hereda" en la base, nunca
        // quedar pegado en el último valor cargado (riesgo "vaciar escribe 0 en vez de null",
        // tarea 7.5 / verificación 11.7).
        producto.setIvaPorcentaje(dto.getIvaPorcentaje());
        producto.setCostoEnvioPorcentaje(dto.getCostoEnvioPorcentaje());
        if (dto.getMonedaCosto() != null) producto.setMonedaCosto(dto.getMonedaCosto());

        reemplazarDescuentos(producto, dto.getDescuentos());

        int oldStock = producto.getStock() == null ? 0 : producto.getStock();
        int newStock = dto.getStock() != null ? dto.getStock() : oldStock;
        int diff = newStock - oldStock;
        producto.setStock(newStock);

        if (stockChanged || costChanged || discountChanged || ivaPropioChanged || envioPropioChanged || descuentosChanged) {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String username = auth != null ? auth.getName() : null;
            com.vivero.gestion.models.Usuario usuario = null;
            if (username != null && !username.equals("anonymousUser")) {
                usuario = usuarioRepository.findByUsername(username).orElse(null);
            }
            
            TipoMovimientoStock tipo = (diff > 0) ? TipoMovimientoStock.INGRESO 
                                     : (diff < 0) ? TipoMovimientoStock.EGRESO 
                                     : TipoMovimientoStock.AJUSTE_INICIAL;
                                     
            movimientoStockService.registrarMovimiento(producto, Math.abs(diff), tipo, usuario);
        }
        
        producto.setLote(dto.getLote());
        producto.setDueno(dto.getDueno());

        calcularPrecioSiAplica(producto);

        Producto actualizado = productoRepository.save(producto);
        sseService.emitStockUpdate(new com.vivero.gestion.dto.StockUpdateEvent(actualizado.getId(), actualizado.getStock()));
        return mapToDTO(actualizado);
    }

    @Override
    @Transactional
    public void eliminarProducto(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        productoRepository.delete(producto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RevisionCostoProductoDTO> listarRevisionCostos() {
        // Misma resolución de unidad que obtenerTodosLosProductos() (Decisión 9 de design.md):
        // sin chequeo nuevo de "es Herramientas" acá, el gate de sección vive en el frontend.
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId == null) {
            return new ArrayList<>();
        }

        // Regla de moneda (Decisión 4, tarea 3.6): un producto USD sin conversión registrada en
        // su último ingreso queda excluido de la lista visible por construcción (la query de
        // findRevisionCostos() no lo puede comparar de forma segura); se deja logueado acá para
        // que el caso sea diagnosticable en vez de simplemente invisible.
        List<Long> usdSinConversion = productoRepository.findProductosUsdSinConversionRegistrada(unidadId);
        for (Long productoId : usdSinConversion) {
            log.warn("Revisión de costos: producto {} tiene moneda_costo=USD pero su último ingreso "
                    + "no registró conversión (moneda_origen/cotizacion_aplicada); queda excluido del "
                    + "panel porque costo_producto y costo_base no son comparables sin la cotización.",
                    productoId);
        }

        List<RevisionCostoProjection> filas = productoRepository.findRevisionCostos(unidadId, LIMITE_REVISION_COSTOS);
        if (filas.isEmpty()) {
            return new ArrayList<>();
        }

        // Sin lógica de negocio nueva sobre el costo (tarea 3.4): sólo se cargan las entidades
        // completas (descuentos, IVA/envío propios, porcentajeGanancia) que la query nativa no
        // trae, para poder reusar CostoCalculator igual que calcularPrecioSiAplica().
        List<Long> productoIds = filas.stream().map(RevisionCostoProjection::getProductoId).collect(Collectors.toList());
        Map<Long, Producto> productosPorId = productoRepository.findAllById(productoIds).stream()
                .collect(Collectors.toMap(Producto::getId, p -> p));

        List<RevisionCostoProductoDTO> resultado = new ArrayList<>();
        for (RevisionCostoProjection fila : filas) {
            Producto producto = productosPorId.get(fila.getProductoId());
            if (producto == null) {
                continue;
            }
            resultado.add(armarFilaRevisionCosto(fila, producto));
        }
        return resultado;
    }

    /**
     * Arma el DTO de una fila del panel de revisión de costos (tarea 3.5). Reusa
     * {@code CostoCalculator.resolverEfectivo()} + {@code CostoCalculator.calcular()} con
     * exactamente los mismos argumentos que {@link #calcularPrecioSiAplica(Producto)}
     * (descuentos del producto, IVA y envío efectivos con fallback a la unidad de negocio), para
     * que {@code precioResultante} sea EXACTAMENTE el precio que queda persistido después de
     * "Actualizar" — nunca una copia nueva de la aritmética.
     */
    private RevisionCostoProductoDTO armarFilaRevisionCosto(RevisionCostoProjection fila, Producto producto) {
        RevisionCostoProductoDTO dto = new RevisionCostoProductoDTO();
        dto.setProductoId(fila.getProductoId());
        dto.setNombre(fila.getNombre());
        dto.setProveedorNombre(fila.getProveedorNombre());
        dto.setFechaUltimoIngreso(fila.getFechaUltimoIngreso());
        dto.setCostoFicha(fila.getCostoFicha());
        dto.setCostoUltimoIngreso(fila.getCostoUltimoIngreso());
        dto.setMonedaCosto(fila.getMonedaCosto());
        dto.setCotizacionAplicada(fila.getCotizacionAplicada());
        dto.setMovimientoId(fila.getMovimientoId());
        dto.setPrecioActual(producto.getPrecio());

        List<BigDecimal> porcentajesDescuento = producto.getDescuentos() == null ? List.of() :
                producto.getDescuentos().stream().map(ProductoDescuento::getPorcentaje).collect(Collectors.toList());
        BigDecimal unidadIva = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getIvaPorcentaje() : null;
        BigDecimal unidadEnvio = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getCostoEnvioPorcentaje() : null;
        BigDecimal ivaEfectivo = CostoCalculator.resolverEfectivo(producto.getIvaPorcentaje(), unidadIva);
        BigDecimal envioEfectivo = CostoCalculator.resolverEfectivo(producto.getCostoEnvioPorcentaje(), unidadEnvio);

        // Costo unitario ACTUAL: sobre costoProducto de la ficha (OQ2) — el mismo número que ya
        // explica el precio actual de la grilla, no un valor nuevo.
        if (producto.getCostoProducto() != null) {
            CostoCalculator.CostoResultado actual = CostoCalculator.calcular(
                    producto.getCostoProducto(), porcentajesDescuento, ivaEfectivo, envioEfectivo);
            dto.setCostoUnitarioActual(actual.getCostoUnitario());
        }

        // Costo unitario RESULTANTE: sobre el costo del último ingreso, ya resuelto por moneda
        // (Decisión 4 — costoUltimoIngresoComparable viene de la proyección, en la MISMA escala
        // que costoProducto: para ARS/null es costo_base tal cual, para USD con conversión es
        // costo_base / cotizacion_aplicada).
        BigDecimal costoNuevoBase = fila.getCostoUltimoIngresoComparable();
        BigDecimal costoFinalNuevo = null;
        if (costoNuevoBase != null) {
            CostoCalculator.CostoResultado resultante = CostoCalculator.calcular(
                    costoNuevoBase, porcentajesDescuento, ivaEfectivo, envioEfectivo);
            costoFinalNuevo = resultante.getCostoUnitario();
            dto.setCostoUnitarioResultante(costoFinalNuevo);
        }

        // Guard de calcularPrecioSiAplica() reproducido tal cual (Decisión 3): sin margen
        // configurado o sin costo nuevo > 0, el precio no se mueve — precioResultante queda
        // igual al actual, nunca un precio inventado.
        boolean hayMargen = producto.getPorcentajeGanancia() != null
                && producto.getPorcentajeGanancia().compareTo(BigDecimal.ZERO) > 0;
        boolean hayCostoNuevo = costoNuevoBase != null && costoNuevoBase.compareTo(BigDecimal.ZERO) > 0;
        if (hayMargen && hayCostoNuevo) {
            BigDecimal gananciaMonto = costoFinalNuevo.multiply(producto.getPorcentajeGanancia())
                    .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
            dto.setPrecioResultante(costoFinalNuevo.add(gananciaMonto));
        } else {
            dto.setPrecioResultante(producto.getPrecio());
        }

        return dto;
    }

    private ProductoDTO mapToDTO(Producto producto) {
        ProductoDTO dto = new ProductoDTO();
        dto.setId(producto.getId());
        dto.setNombre(producto.getNombre());
        dto.setDescripcion(producto.getDescripcion());
        dto.setPrecio(producto.getPrecio());
        if (producto.getProveedor() != null) {
            dto.setProveedorId(producto.getProveedor().getId());
            dto.setProveedorNombre(producto.getProveedor().getNombre());
        }
        dto.setCostoProducto(producto.getCostoProducto());
        dto.setDescuentoProveedor(producto.getDescuentoProveedor());
        dto.setPorcentajeGanancia(producto.getPorcentajeGanancia());
        dto.setCostoUnitarioHistorico(producto.getCostoUnitarioHistorico() != null ? producto.getCostoUnitarioHistorico() : producto.getCostoProducto());
        dto.setStock(producto.getStock());
        dto.setLote(producto.getLote());
        dto.setNumeroSiembra(producto.getNumeroSiembra());
        dto.setDueno(producto.getDueno());
        // Nunca se expone la entidad ProductoDescuento (regla dura: DTOs siempre, tarea 7.6):
        // se mapea a una lista de ProductoDescuentoDTO con sólo nombre + porcentaje.
        dto.setDescuentos(
                producto.getDescuentos() == null ? new ArrayList<>() :
                producto.getDescuentos().stream()
                        .map(d -> new ProductoDescuentoDTO(d.getNombre(), d.getPorcentaje()))
                        .collect(Collectors.toList())
        );
        dto.setIvaPorcentaje(producto.getIvaPorcentaje());
        dto.setCostoEnvioPorcentaje(producto.getCostoEnvioPorcentaje());
        dto.setMonedaCosto(producto.getMonedaCosto() != null ? producto.getMonedaCosto() : com.vivero.gestion.models.MonedaCosto.ARS);
        return dto;
    }

    private void calcularPrecioSiAplica(Producto producto) {
        // Guard agregado en la tanda de fixes puntuales del 2026-08-20 (Problema 3/4): además de
        // requerir porcentajeGanancia > 0, ahora también se exige costoProducto > 0. Sin este
        // guard, un producto de Vivero (que nace con porcentajeGanancia = 30 por defecto — mismo
        // default que Herramientas, Problema 4 — pero SIN costoProducto, porque el formulario de
        // Vivero no tiene panel de costeo y el precio se tipea directo) recalculaba con
        // costoBase = ZERO y terminaba pisando el precio recién tipeado por el usuario con 0. Con
        // el guard, si no hay costo real cargado no hay base sobre la cual calcular un margen: se
        // deja el precio tal cual vino en el DTO (el que el usuario decidió a mano).
        if (producto.getPorcentajeGanancia() != null && producto.getPorcentajeGanancia().compareTo(BigDecimal.ZERO) > 0
                && producto.getCostoProducto() != null && producto.getCostoProducto().compareTo(BigDecimal.ZERO) > 0) {
            // Tercera copia de la fórmula eliminada (tarea 7.1): ahora pasa por el mismo
            // CostoCalculator que MovimientoStockServiceImpl (grupo 6), con el mismo fallback de
            // IVA/envío producto -> unidad de negocio (Decisión 5). Lo único que este método
            // sigue haciendo a mano es aplicar porcentajeGanancia sobre el costo final — eso no
            // es parte del calculador (Decisión 6: el calculador no sabe de precio de venta).
            BigDecimal costoBase = producto.getCostoProducto();

            List<BigDecimal> porcentajesDescuento = producto.getDescuentos() == null ? List.of() :
                    producto.getDescuentos().stream().map(ProductoDescuento::getPorcentaje).collect(Collectors.toList());

            BigDecimal unidadIva = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getIvaPorcentaje() : null;
            BigDecimal unidadEnvio = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getCostoEnvioPorcentaje() : null;
            BigDecimal ivaEfectivo = CostoCalculator.resolverEfectivo(producto.getIvaPorcentaje(), unidadIva);
            BigDecimal envioEfectivo = CostoCalculator.resolverEfectivo(producto.getCostoEnvioPorcentaje(), unidadEnvio);

            CostoCalculator.CostoResultado resultado = CostoCalculator.calcular(costoBase, porcentajesDescuento, ivaEfectivo, envioEfectivo);
            BigDecimal costoFinal = resultado.getCostoUnitario();

            BigDecimal gananciaMonto = costoFinal.multiply(producto.getPorcentajeGanancia()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
            producto.setPrecio(costoFinal.add(gananciaMonto));
        }
    }

    /**
     * Valida el DTO de entrada antes de crear/actualizar (tarea 8.3): cada descuento debe tener
     * nombre no vacío y porcentaje &gt;= 0; IVA y envío propios, cuando vienen informados
     * (no null), también deben ser &gt;= 0. Un valor negativo o un descuento sin nombre rechaza
     * la operación completa, sin persistir nada parcial.
     */
    private void validarProducto(ProductoDTO dto) {
        if (dto.getDescuentos() != null) {
            for (ProductoDescuentoDTO d : dto.getDescuentos()) {
                if (d.getNombre() == null || d.getNombre().trim().isEmpty()) {
                    throw new IllegalArgumentException("Cada descuento debe tener un nombre.");
                }
                if (d.getPorcentaje() == null || d.getPorcentaje().compareTo(BigDecimal.ZERO) < 0) {
                    throw new IllegalArgumentException("El porcentaje del descuento \"" + d.getNombre() + "\" no puede ser negativo.");
                }
            }
        }
        if (dto.getIvaPorcentaje() != null && dto.getIvaPorcentaje().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El IVA del producto no puede ser negativo.");
        }
        if (dto.getCostoEnvioPorcentaje() != null && dto.getCostoEnvioPorcentaje().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El costo de envío del producto no puede ser negativo.");
        }
    }

    /**
     * Reemplaza por completo la lista de descuentos del producto con lo que trajo el DTO,
     * apoyándose en el orphanRemoval=true de Producto.descuentos (tarea 7.5): las filas que ya no
     * están en el DTO se borran solas al hacer flush, y las nuevas se insertan. El orden de la
     * lista del DTO (el orden en que las cargó el usuario en el formulario) se conserva en
     * "orden" — es puramente presentacional (Decisión 1), el cálculo de costo no depende de él.
     */
    private void reemplazarDescuentos(Producto producto, List<ProductoDescuentoDTO> nuevos) {
        producto.getDescuentos().clear();
        if (nuevos == null) {
            return;
        }
        int orden = 0;
        for (ProductoDescuentoDTO d : nuevos) {
            ProductoDescuento entidad = new ProductoDescuento();
            entidad.setProducto(producto);
            entidad.setNombre(d.getNombre());
            entidad.setPorcentaje(d.getPorcentaje());
            entidad.setOrden(orden++);
            producto.getDescuentos().add(entidad);
        }
    }

    /**
     * Compara dos BigDecimal por VALOR (compareTo), no por escala (equals): "5.0" y "5.00" son el
     * mismo IVA aunque .equals() los vea distintos — la comparación de igualdad de tipo objeto de
     * BigDecimal es sensible a la escala y produciría falsos "cambió" según cómo Jackson
     * deserializó el JSON entrante. null se trata como "hereda", distinto de cualquier valor
     * concreto (incluido ZERO, Decisión 5).
     */
    private boolean bigDecimalChanged(BigDecimal nuevo, BigDecimal actual) {
        if (nuevo == null && actual == null) return false;
        if (nuevo == null || actual == null) return true;
        return nuevo.compareTo(actual) != 0;
    }

    /**
     * Compara contenido, no tamaño (tarea 7.4): pasar "Volumen 5%" a "Volumen 7%" no cambia la
     * cantidad de filas y tiene que detectarse igual que un alta o una baja.
     */
    private boolean descuentosCambiaron(List<ProductoDescuento> actuales, List<ProductoDescuentoDTO> nuevos) {
        List<ProductoDescuento> actualesSeguro = actuales == null ? List.of() : actuales;
        List<ProductoDescuentoDTO> nuevosSeguro = nuevos == null ? List.of() : nuevos;

        if (actualesSeguro.size() != nuevosSeguro.size()) {
            return true;
        }
        for (int i = 0; i < actualesSeguro.size(); i++) {
            ProductoDescuento actual = actualesSeguro.get(i);
            ProductoDescuentoDTO nuevo = nuevosSeguro.get(i);
            boolean mismoNombre = Objects.equals(actual.getNombre(), nuevo.getNombre());
            boolean mismoPorcentaje = actual.getPorcentaje() != null && nuevo.getPorcentaje() != null
                    && actual.getPorcentaje().compareTo(nuevo.getPorcentaje()) == 0;
            if (!mismoNombre || !mismoPorcentaje) {
                return true;
            }
        }
        return false;
    }
}
