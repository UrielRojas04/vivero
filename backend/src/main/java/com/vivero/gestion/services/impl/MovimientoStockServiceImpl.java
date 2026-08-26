package com.vivero.gestion.services.impl;

import com.vivero.gestion.models.CapaCostoStock;
import com.vivero.gestion.models.MonedaCosto;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.ProductoDescuento;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.CapaCostoStockRepository;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.services.CostoCalculator;
import com.vivero.gestion.services.CosteoPorCapasCalculator;
import com.vivero.gestion.services.MovimientoStockService;
import com.vivero.gestion.services.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class MovimientoStockServiceImpl implements MovimientoStockService {

    @Autowired
    private MovimientoStockRepository movimientoStockRepository;

    // Repositorio de capas (costeo-fifo-herramientas, grupo 6 — el nombre del directorio del
    // change es histórico, el algoritmo NO es FIFO). Sólo se usa cuando el producto tiene el
    // costeo por capas habilitado (Decisión 7); con el flag en false ni siquiera se consulta.
    @Autowired
    private CapaCostoStockRepository capaCostoStockRepository;

    // Auto-ajuste de costoProducto/precio hacia arriba (pedido puntual del usuario, 2026-08-25 —
    // ver ProductoService.ajustarCostoSiSuperaAlActual). @Lazy es obligatorio acá: ProductoServiceImpl
    // depende de MovimientoStockService por constructor (para el AJUSTE_INICIAL de crearProducto),
    // así que una dependencia directa y eager en sentido inverso es un ciclo real que Spring no
    // puede resolver al arrancar (BeanCurrentlyInCreationException) — con @Lazy se inyecta un
    // proxy y la referencia real recién se resuelve en el primer uso, momento en el que el
    // contenedor ya terminó de armar ambos beans. Se evaluó extraer la fórmula de precio a un
    // método estático compartido para evitar el ciclo del todo, pero eso hubiera significado
    // sacarla de ProductoServiceImpl (donde ya vive reusada por crearProducto/actualizarProducto/
    // listarRevisionCostos) sin necesidad real — @Lazy es el fix mínimo, estándar de Spring, y no
    // duplica la fórmula de precio.
    @Autowired
    @Lazy
    private ProductoService productoService;

    @Override
    @Transactional
    public MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario) {
        // La firma de 4 parámetros delega en la de 5 con costoBaseExplicito = null: se comporta
        // exactamente igual que antes (costoBase sale de producto.getCostoProducto()), y queda una
        // sola implementación de la fórmula (Decisión 4 de design.md, tarea 5.3).
        return registrarMovimiento(producto, cantidad, tipo, usuario, null);
    }

    @Override
    @Transactional
    public MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario,
                                                 BigDecimal costoBaseExplicito) {
        // Delega en la sobrecarga de 7 parámetros con monedaLinea=null, cotizacionAplicada=null:
        // se comporta exactamente igual que antes (identidad, sin conversión de moneda) — una
        // sola implementación (tarea 6.9/config-costeo-por-proveedor).
        return registrarMovimiento(producto, cantidad, tipo, usuario, costoBaseExplicito, null, null);
    }

    @Override
    @Transactional
    public MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario,
                                                 BigDecimal costoBaseExplicito, MonedaCosto monedaLinea, BigDecimal cotizacionAplicada) {
        // Delega en la sobrecarga de 9 parámetros con ivaPactadoExplicito=null,
        // envioPactadoExplicito=null: se comporta exactamente igual que antes (fallback de siempre
        // a la ficha del producto) — una sola implementación (reapertura puntual de la Decisión 6,
        // 2026-08-25).
        return registrarMovimiento(producto, cantidad, tipo, usuario, costoBaseExplicito, monedaLinea, cotizacionAplicada, null, null);
    }

    @Override
    @Transactional
    public MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario,
                                                 BigDecimal costoBaseExplicito, MonedaCosto monedaLinea, BigDecimal cotizacionAplicada,
                                                 BigDecimal ivaPactadoExplicito, BigDecimal envioPactadoExplicito) {
        // Delega en la sobrecarga de 11 parámetros con descuentoPactadoExplicito=null,
        // descuentoPactadoDetalleExplicito=null: se comporta exactamente igual que antes (fallback
        // de siempre a la cascada de producto.getDescuentos()) — una sola implementación
        // (ampliación de pedido-planilla-editable, descuentos editables para línea existente,
        // 2026-08-25).
        return registrarMovimiento(producto, cantidad, tipo, usuario, costoBaseExplicito, monedaLinea, cotizacionAplicada,
                ivaPactadoExplicito, envioPactadoExplicito, null, null);
    }

    @Override
    @Transactional
    public MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario,
                                                 BigDecimal costoBaseExplicito, MonedaCosto monedaLinea, BigDecimal cotizacionAplicada,
                                                 BigDecimal ivaPactadoExplicito, BigDecimal envioPactadoExplicito,
                                                 BigDecimal descuentoPactadoExplicito, String descuentoPactadoDetalleExplicito) {
        // Flag leído UNA SOLA VEZ, al principio, y NUNCA comparado por id de unidad de negocio
        // (Decisión 7 de costeo-fifo-herramientas — el nombre del directorio del change es
        // histórico, el algoritmo final NO es FIFO). Con el flag en false, este método hace
        // EXACTAMENTE lo que hacía antes de este change, línea por línea: las ramas nuevas de
        // abajo (crearCapa / registrarEgresoPorCapas) son código muerto para Vivero, ninguna se
        // alcanza. Contrato de no-regresión (tarea 6.2).
        boolean porCapas = producto.getUnidadNegocio() != null
                && producto.getUnidadNegocio().isCosteoPorCapasHabilitado();

        MovimientoStock mov = new MovimientoStock();
        mov.setProducto(producto);
        mov.setUnidadNegocio(producto.getUnidadNegocio());
        mov.setCantidad(cantidad);
        mov.setTipoMovimiento(tipo);
        mov.setUsuario(usuario);
        mov.setFecha(LocalDateTime.now());

        if (tipo == TipoMovimientoStock.INGRESO || tipo == TipoMovimientoStock.AJUSTE_INICIAL) {
            // costoBaseExplicito != null: viene de un pedido a proveedor confirmado (el
            // costoUnitarioPactado de ese ítem). null: comportamiento genérico sin cambios, se
            // deriva de producto.getCostoProducto() como siempre. La rama de egresos (más abajo,
            // sin tocar) no recibe este parámetro.
            BigDecimal costoBase = costoBaseExplicito != null ? costoBaseExplicito
                    : (producto.getCostoProducto() != null ? producto.getCostoProducto() : BigDecimal.ZERO);
            aplicarDesglose(mov, producto, costoBase, monedaLinea, cotizacionAplicada, ivaPactadoExplicito, envioPactadoExplicito,
                    descuentoPactadoExplicito, descuentoPactadoDetalleExplicito);
        } else if (porCapas) {
            // Rama nueva de egreso por capas (tareas 6.5-6.14): resuelve su propio desglose y
            // persiste su propio (único) MovimientoStock — retorno propio, no cae al save() de
            // abajo. Sólo alcanzable con el flag en true (Herramientas, tras la migración).
            return registrarEgresoPorCapas(mov, producto, cantidad);
        } else {
            // Rama de egreso de SIEMPRE, sin tocar una línea (contrato de no-regresión de Vivero,
            // y de Herramientas mientras el flag siga en false).
            MovimientoStock lastIngreso = movimientoStockRepository.findFirstByProductoIdAndTipoMovimientoInOrderByFechaDesc(
                producto.getId(),
                java.util.Arrays.asList(TipoMovimientoStock.INGRESO, TipoMovimientoStock.AJUSTE_INICIAL)
            );

            if (lastIngreso != null) {
                mov.setCostoBase(lastIngreso.getCostoBase());
                mov.setDescuentoPorcentaje(lastIngreso.getDescuentoPorcentaje());
                mov.setEnvioPorcentaje(lastIngreso.getEnvioPorcentaje());
                mov.setCostoUnitario(lastIngreso.getCostoUnitario());
                mov.setCostoNeto(lastIngreso.getCostoNeto());
                mov.setIvaPorcentaje(lastIngreso.getIvaPorcentaje());
                mov.setDescuentoDetalle(lastIngreso.getDescuentoDetalle());
            } else {
                BigDecimal costoBase = producto.getCostoProducto() != null ? producto.getCostoProducto() : BigDecimal.ZERO;
                aplicarDesglose(mov, producto, costoBase, null, null, null, null, null, null);
            }
        }

        MovimientoStock guardado = movimientoStockRepository.save(mov);

        // Creación de capa (tareas 6.3/6.4): SÓLO ingreso/ajuste con cantidad > 0 y flag activo.
        // Un AJUSTE_INICIAL de cantidad 0 (cambio de configuración) se registra igual que siempre
        // arriba, pero no llega acá con capa — es el arreglo de los 5 costos fantasma. Crear la
        // capa NUNCA escribe Producto.stock (tarea 6.9): eso lo mueve el llamador, como siempre.
        if (porCapas && (tipo == TipoMovimientoStock.INGRESO || tipo == TipoMovimientoStock.AJUSTE_INICIAL)
                && cantidad != null && cantidad > 0) {
            crearCapa(guardado, producto);
            // Auto-ajuste hacia arriba (pedido puntual del usuario, 2026-08-25): sólo cuando el
            // costo BASE de ESTE movimiento (guardado.getCostoBase(), pre-descuentos/IVA/envío —
            // el mismo tipo de número que Producto.costoProducto) supera producto.getCostoProducto()
            // actual. Deliberadamente NO se usa CapaCostoStock.getCostoUnitario(): ese valor ya tiene
            // la fórmula completa aplicada (viene de CostoCalculator), y pasarlo acá haría que
            // ajustarCostoSiSuperaAlActual() vuelva a aplicar descuento/IVA/envío una segunda vez al
            // recalcular precio (doble conteo verificado con datos reales). Update silencioso de
            // catálogo, misma transacción, sin generar ningún MovimientoStock adicional — no toca
            // producto.stock. Sólo alcanzable acá dentro (porCapas == true); Vivero nunca entra a
            // esta rama (tarea 6.2, contrato de no-regresión).
            productoService.ajustarCostoSiSuperaAlActual(producto, guardado.getCostoBase());
        }

        return guardado;
    }

    // Crea la capa que corresponde a un movimiento entrante con cantidad > 0 (Decisión 1/4). El
    // costoUnitario y la fecha se copian UNA VEZ del movimiento ya persistido — nunca se vuelven a
    // tocar (contrato de CapaCostoStock). No escribe Producto.stock.
    private CapaCostoStock crearCapa(MovimientoStock movimientoIngreso, Producto producto) {
        CapaCostoStock capa = new CapaCostoStock();
        capa.setProducto(producto);
        capa.setMovimiento(movimientoIngreso);
        capa.setUnidadNegocio(producto.getUnidadNegocio());
        capa.setCantidadOriginal(movimientoIngreso.getCantidad());
        capa.setCantidadRestante(movimientoIngreso.getCantidad());
        capa.setCostoUnitario(movimientoIngreso.getCostoUnitario());
        capa.setFecha(movimientoIngreso.getFecha());
        return capaCostoStockRepository.save(capa);
    }

    // Rama de egreso con costeo por capas activo (VENTA / EGRESO / MERMA — tarea 6.5). Orden
    // EXACTO, crítico y verificado (tarea 6.6):
    //   1) capa de referencia ANTES de descontar nada;
    //   2) congelar en el movimiento el desglose completo de esa capa, siguiendo su FK;
    //   3) descontar cantidades de las capas activas, más vieja primero;
    //   4) persistir UN SOLO MovimientoStock por la cantidad total.
    // Invertir 1 y 3 es el error más fácil de cometer y el más difícil de detectar después: una
    // venta que agota la capa cara reportaría el costo barato, justo lo contrario de lo pedido.
    private MovimientoStock registrarEgresoPorCapas(MovimientoStock mov, Producto producto, Integer cantidad) {
        List<CapaCostoStock> capasActivas = capaCostoStockRepository
                .findByProductoIdAndCantidadRestanteGreaterThanOrderByFechaAscIdAsc(producto.getId(), 0);

        // Paso 1: capa de referencia (máximo activo, desempate fecha ASC/id ASC), evaluada sobre
        // el estado ANTES de tocar ninguna cantidad (Decisión 2).
        CapaCostoStock referencia = CosteoPorCapasCalculator.capaDeReferencia(capasActivas);

        if (referencia == null) {
            // Fallback sin capas activas (tarea 6.8): stock 0 todavía sin migrar, o recién
            // migrado sin capas para este producto. Mismo criterio de HOY — copiar el último
            // ingreso. Es lo que permite activar el flag de forma incremental y reversible.
            MovimientoStock lastIngreso = movimientoStockRepository.findFirstByProductoIdAndTipoMovimientoInOrderByFechaDesc(
                producto.getId(),
                java.util.Arrays.asList(TipoMovimientoStock.INGRESO, TipoMovimientoStock.AJUSTE_INICIAL)
            );
            if (lastIngreso != null) {
                mov.setCostoBase(lastIngreso.getCostoBase());
                mov.setDescuentoPorcentaje(lastIngreso.getDescuentoPorcentaje());
                mov.setEnvioPorcentaje(lastIngreso.getEnvioPorcentaje());
                mov.setCostoUnitario(lastIngreso.getCostoUnitario());
                mov.setCostoNeto(lastIngreso.getCostoNeto());
                mov.setIvaPorcentaje(lastIngreso.getIvaPorcentaje());
                mov.setDescuentoDetalle(lastIngreso.getDescuentoDetalle());
            } else {
                BigDecimal costoBase = producto.getCostoProducto() != null ? producto.getCostoProducto() : BigDecimal.ZERO;
                aplicarDesglose(mov, producto, costoBase, null, null, null, null, null, null);
            }
            return movimientoStockRepository.save(mov);
        }

        // Paso 2: congelar el desglose completo de la capa de referencia, siguiendo su FK al
        // MovimientoStock de ingreso que la originó (la capa sólo denormaliza costoUnitario; el
        // resto del desglose vive únicamente en ese movimiento — Decisión 1). Mismo bloque de
        // copia que el fallback/rama vieja usan con "lastIngreso", con otra fuente.
        MovimientoStock movimientoOrigen = referencia.getMovimiento();
        mov.setCostoBase(movimientoOrigen.getCostoBase());
        mov.setDescuentoPorcentaje(movimientoOrigen.getDescuentoPorcentaje());
        mov.setEnvioPorcentaje(movimientoOrigen.getEnvioPorcentaje());
        mov.setCostoUnitario(movimientoOrigen.getCostoUnitario());
        mov.setCostoNeto(movimientoOrigen.getCostoNeto());
        mov.setIvaPorcentaje(movimientoOrigen.getIvaPorcentaje());
        mov.setDescuentoDetalle(movimientoOrigen.getDescuentoDetalle());

        // Paso 3: descontar cantidades, más vieja primero (Decisión 2b), delegando en el motor
        // puro y testeado (grupo 5). Todo o nada: si no alcanza, lanza SIN tocar ninguna capa —
        // @Transactional revierte el movimiento también (tarea 6.10).
        CosteoPorCapasCalculator.descontar(capasActivas, cantidad);
        // Persistencia explícita de las capas mutadas (mismo estilo que el resto del código base
        // — ver productoRepository.save(producto) tras producto.setStock(...) en
        // PedidoServiceImpl/VentaServiceImpl/ProductoServiceImpl): el UPDATE cae exclusivamente
        // sobre capas_costo_stock.cantidad_restante, nunca sobre movimientos_stock (tarea 6.14).
        capaCostoStockRepository.saveAll(capasActivas);

        // Paso 4: un solo MovimientoStock por la cantidad total del egreso (tarea 6.7 — la firma
        // del servicio no cambia, sigue devolviendo uno solo).
        return movimientoStockRepository.save(mov);
    }

    private void aplicarDesglose(MovimientoStock mov, Producto producto, BigDecimal costoBase,
                                  MonedaCosto monedaLinea, BigDecimal cotizacionAplicada,
                                  BigDecimal ivaPactadoExplicito, BigDecimal envioPactadoExplicito,
                                  BigDecimal descuentoPactadoExplicito, String descuentoPactadoDetalleExplicito) {
        // Ampliación de pedido-planilla-editable (descuentos editables también para una línea de
        // producto YA EXISTENTE, 2026-08-25): un descuentoPactadoExplicito no nulo (incluido 0)
        // reemplaza POR COMPLETO la cascada que se derivaría de producto.getDescuentos() para ESTE
        // movimiento puntual — mismo criterio que costoBaseExplicito ya reemplaza
        // producto.getCostoProducto(). Es un único factor YA COLAPSADO (no una lista de
        // descuentos individuales): con un solo elemento en la cascada,
        // CostoCalculator.calcular() devuelve descuentoEfectivoPorcentaje ==
        // descuentoPactadoExplicito exactamente. El detalle textual persistido es el de LA LÍNEA
        // (descuentoPactadoDetalleExplicito), no el de la ficha — puede ser null (ej. 0% sin
        // desglose), igual que el caso "sin descuentos" de la rama de siempre.
        List<BigDecimal> porcentajes;
        String detalleTexto;
        if (descuentoPactadoExplicito != null) {
            porcentajes = List.of(descuentoPactadoExplicito);
            detalleTexto = descuentoPactadoDetalleExplicito;
        } else {
            List<ProductoDescuento> descuentos = producto.getDescuentos();
            List<BigDecimal> lista = new ArrayList<>();
            StringBuilder detalle = new StringBuilder();
            if (descuentos != null) {
                for (ProductoDescuento d : descuentos) {
                    lista.add(d.getPorcentaje());
                    if (detalle.length() > 0) {
                        detalle.append("; ");
                    }
                    detalle.append(d.getNombre()).append(" ").append(d.getPorcentaje().setScale(2, RoundingMode.HALF_UP)).append("%");
                }
            }
            porcentajes = lista;
            detalleTexto = detalle.length() > 0 ? detalle.toString() : null;
        }

        // Reapertura puntual de la Decisión 6, sólo IVA/envío (pedido explícito del usuario,
        // 2026-08-25, fuera de OpenSpec): un valor pactado explícito de ESTA línea de pedido (no
        // nulo, incluido 0) gana sobre la ficha del producto para ESTE cálculo puntual — igual que
        // costoBaseExplicito ya ganaba sobre producto.getCostoProducto(). null se comporta
        // exactamente igual que antes: fallback resolverEfectivo(ficha del producto, default de la
        // unidad).
        BigDecimal unidadIva = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getIvaPorcentaje() : null;
        BigDecimal unidadEnvio = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getCostoEnvioPorcentaje() : null;
        BigDecimal ivaEfectivo = ivaPactadoExplicito != null
                ? ivaPactadoExplicito
                : CostoCalculator.resolverEfectivo(producto.getIvaPorcentaje(), unidadIva);
        BigDecimal envioEfectivo = envioPactadoExplicito != null
                ? envioPactadoExplicito
                : CostoCalculator.resolverEfectivo(producto.getCostoEnvioPorcentaje(), unidadEnvio);

        // Paso 0 de conversión de moneda (config-costeo-por-proveedor, grupo 6/7 de tasks.md): el
        // guard "sólo si USD" vive dentro de CostoCalculator, acá sólo se pasan los datos crudos
        // de la línea. monedaLinea == null (o != USD) da exactamente el mismo resultado que la
        // sobrecarga vieja de 4 parámetros (identidad, sin conversión).
        CostoCalculator.CostoResultado resultado = CostoCalculator.calcular(
                costoBase, monedaLinea, cotizacionAplicada, porcentajes, ivaEfectivo, envioEfectivo);

        // costoBase congelado: el YA CONVERTIDO (identidad si no era USD, tarea 6.4/7 — permite
        // reconstruir el precio de lista original dividiendo por cotizacionAplicada, tarea 7.7).
        mov.setCostoBase(resultado.getCostoBaseConvertido());
        mov.setCostoNeto(resultado.getNetoConDescuentos());
        mov.setDescuentoPorcentaje(resultado.getDescuentoEfectivoPorcentaje());
        mov.setDescuentoDetalle(detalleTexto);
        mov.setIvaPorcentaje(ivaEfectivo);
        mov.setEnvioPorcentaje(envioEfectivo);
        mov.setCostoUnitario(resultado.getCostoUnitario());
        // Congelado de moneda (tarea 7.5): NULL para líneas en pesos (o fuera del contexto de un
        // pedido), informado sólo cuando la conversión efectivamente ocurrió.
        mov.setMonedaOrigen(resultado.getMonedaAplicada());
        mov.setCotizacionAplicada(resultado.getCotizacionAplicada());
    }
}
