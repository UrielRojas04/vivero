package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.dto.ProductoDescuentoDTO;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.ProductoDescuento;
import com.vivero.gestion.repositories.ProductoRepository;
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
    @Transactional
    public boolean actualizarFichaSiCostoFinalSupera(Producto producto, BigDecimal costoBasePactado,
                                                       BigDecimal ivaPactado, BigDecimal envioPactado,
                                                       BigDecimal descuentoPactadoPorcentaje,
                                                       String descuentoPactadoDetalle) {
        // Unificación de ajustarCostoSiSuperaAlActual + actualizarIvaEnvioSiDistinto +
        // actualizarDescuentosSiDistinto (fix del bug real del 2026-08-26, ver Javadoc en la
        // interfaz): el ratchet ahora compara el costo FINAL completo, no sólo la base, así que las
        // cuatro piezas (costoProducto/descuentos/IVA/envío) sólo se mueven JUNTAS o no se mueven
        // nada — nunca puede pasar que el final termine bajando porque una pieza se comparó sola.
        if (costoBasePactado == null) {
            return false;
        }

        BigDecimal unidadIva = producto.getUnidadNegocio() != null
                ? producto.getUnidadNegocio().getIvaPorcentaje() : null;
        BigDecimal unidadEnvio = producto.getUnidadNegocio() != null
                ? producto.getUnidadNegocio().getCostoEnvioPorcentaje() : null;
        BigDecimal ivaEfectivoActual = CostoCalculator.resolverEfectivo(producto.getIvaPorcentaje(), unidadIva);
        BigDecimal envioEfectivoActual = CostoCalculator.resolverEfectivo(producto.getCostoEnvioPorcentaje(), unidadEnvio);
        BigDecimal descuentoEfectivoActualPct = descuentoEfectivoActual(producto);

        // Final ACTUAL: costo/descuentos/IVA/envío tal como están HOY en la ficha (cascada real de
        // producto.getDescuentos(), no colapsada) — costoProducto null se trata como 0 vía
        // CostoCalculator.calcular (mismo criterio que el ratchet viejo: sin costo de referencia,
        // cualquier compra pactada > 0 gana).
        List<BigDecimal> porcentajesDescuentoActuales = producto.getDescuentos() == null ? List.of() :
                producto.getDescuentos().stream().map(ProductoDescuento::getPorcentaje).collect(Collectors.toList());
        BigDecimal finalActual = CostoCalculator.calcular(
                producto.getCostoProducto(), porcentajesDescuentoActuales, ivaEfectivoActual, envioEfectivoActual)
                .getCostoUnitario();

        // Final PACTADO: los 4 valores de ESTA compra. Un null en iva/envío/descuento (línea de un
        // pedido viejo, de antes de que el campo existiera) usa el valor EFECTIVO/actual de la
        // ficha para ESE campo puntual — si ninguno de los 3 aporta nada nuevo, el final pactado
        // sólo puede superar al actual si costoBasePactado por sí solo ya alcanza, y en ese caso el
        // resto de los campos no se escriben más abajo (quedan como estaban).
        BigDecimal ivaParaPactado = ivaPactado != null ? ivaPactado : ivaEfectivoActual;
        BigDecimal envioParaPactado = envioPactado != null ? envioPactado : envioEfectivoActual;
        BigDecimal descuentoParaPactado = descuentoPactadoPorcentaje != null ? descuentoPactadoPorcentaje : descuentoEfectivoActualPct;
        BigDecimal finalPactado = CostoCalculator.calcular(
                costoBasePactado, List.of(descuentoParaPactado), ivaParaPactado, envioParaPactado)
                .getCostoUnitario();

        if (finalPactado.compareTo(finalActual) <= 0) {
            // Menor o igual: no se toca NADA de la ficha (ni costo, ni descuentos, ni IVA, ni
            // envío) — todo o nada, nunca parcial. "Igual" también cuenta como "no sube" (excluye
            // el empate a propósito, no sólo la baja).
            return false;
        }

        producto.setCostoProducto(costoBasePactado);
        if (ivaPactado != null) {
            producto.setIvaPorcentaje(ivaPactado);
        }
        if (envioPactado != null) {
            producto.setCostoEnvioPorcentaje(envioPactado);
        }
        if (descuentoPactadoPorcentaje != null) {
            // Reconstruye los descuentos con sus nombres REALES parseando descuentoPactadoDetalle
            // (fix del segundo bug del 2026-08-26: antes se colapsaba todo a una única entrada
            // sintética "Proveedor", perdiendo los nombres individuales) — mismo formato que ya
            // arma el frontend y que aplicarDesglose() de MovimientoStockServiceImpl reproduce
            // hacia el texto de MovimientoStock.descuentoDetalle. Sin desglose textual disponible
            // (pedido viejo, o línea sin descuentos) la ficha queda con la lista vacía: no se
            // inventa ninguna entrada sintética.
            List<ProductoDescuentoDTO> descuentosIndividuales = parsearDescuentosPactados(descuentoPactadoDetalle);
            producto.getDescuentos().clear();
            int orden = 0;
            for (ProductoDescuentoDTO d : descuentosIndividuales) {
                ProductoDescuento entidad = new ProductoDescuento();
                entidad.setProducto(producto);
                entidad.setNombre(d.getNombre());
                entidad.setPorcentaje(d.getPorcentaje());
                entidad.setOrden(orden++);
                producto.getDescuentos().add(entidad);
            }
        }

        calcularPrecioSiAplica(producto);
        productoRepository.save(producto);
        return true;
    }

    // Patrón del desglose textual de un descuento individual dentro de descuentoPactadoDetalle:
    // "Nombre XX.XX%" (nombre puede tener espacios, el número final antes del "%" es el
    // porcentaje). Formato controlado por nuestro propio frontend (descuentoDetalleTexto() en
    // PedidoNuevo.jsx) y por aplicarDesglose() de MovimientoStockServiceImpl — seguro de parsear.
    private static final java.util.regex.Pattern DESCUENTO_DETALLE_PATTERN =
            java.util.regex.Pattern.compile("^(.+?)\\s+([0-9]+(?:[.,][0-9]+)?)%$");

    /**
     * Parsea el desglose textual de descuentos pactados de una línea de pedido (formato
     * {@code "Nombre XX.XX%; Nombre2 YY.YY%"}) en la lista real de descuentos con sus nombres
     * individuales — reemplaza el colapso anterior a una única entrada sintética "Proveedor" (bug
     * reportado por el usuario, 2026-08-26: se perdían los nombres reales al persistir en la
     * ficha). {@code null}/vacío o sin partes reconocibles -&gt; lista vacía (línea sin
     * descuentos, o pedido de antes de que este campo existiera) — nunca se inventa una entrada
     * sintética. Usado tanto por {@link #actualizarFichaSiCostoFinalSupera} como por
     * {@code PedidoServiceImpl} al dar de alta un producto nuevo desde una línea "pendiente".
     */
    public static List<ProductoDescuentoDTO> parsearDescuentosPactados(String descuentoPactadoDetalle) {
        List<ProductoDescuentoDTO> resultado = new ArrayList<>();
        if (descuentoPactadoDetalle == null || descuentoPactadoDetalle.trim().isEmpty()) {
            return resultado;
        }
        for (String parte : descuentoPactadoDetalle.split(";")) {
            String p = parte.trim();
            if (p.isEmpty()) {
                continue;
            }
            java.util.regex.Matcher m = DESCUENTO_DETALLE_PATTERN.matcher(p);
            if (!m.matches()) {
                // Defensivo: no debería pasar con el formato controlado de arriba — se ignora en
                // vez de romper la confirmación de recepción por un dato textual inesperado.
                continue;
            }
            try {
                String nombre = m.group(1).trim();
                BigDecimal porcentaje = new BigDecimal(m.group(2).replace(",", "."));
                resultado.add(new ProductoDescuentoDTO(nombre, porcentaje));
            } catch (NumberFormatException ignored) {
                // Idem: formato inesperado, se ignora esa parte puntual.
            }
        }
        return resultado;
    }

    /**
     * % efectivo COLAPSADO actual de producto.getDescuentos() (misma cascada — producto de
     * factores, nunca suma — que CostoCalculator.calcular() usa para el costo real): reusa el
     * mismo calculador en vez de reimplementar la fórmula a mano. costoBase/IVA/envío no
     * participan del descuentoEfectivoPorcentaje resultante, así que se pasan en CERO — sólo
     * interesa ese único campo del resultado.
     */
    private BigDecimal descuentoEfectivoActual(Producto producto) {
        List<BigDecimal> porcentajes = producto.getDescuentos() == null ? List.of() :
                producto.getDescuentos().stream().map(ProductoDescuento::getPorcentaje).collect(Collectors.toList());
        return CostoCalculator.calcular(BigDecimal.ZERO, porcentajes, BigDecimal.ZERO, BigDecimal.ZERO)
                .getDescuentoEfectivoPorcentaje();
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
