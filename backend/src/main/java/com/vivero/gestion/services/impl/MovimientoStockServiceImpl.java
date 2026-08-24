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
import org.springframework.beans.factory.annotation.Autowired;
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
            aplicarDesglose(mov, producto, costoBase, monedaLinea, cotizacionAplicada);
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
                aplicarDesglose(mov, producto, costoBase, null, null);
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
        }

        return guardado;
    }

    // Crea la capa que corresponde a un movimiento entrante con cantidad > 0 (Decisión 1/4). El
    // costoUnitario y la fecha se copian UNA VEZ del movimiento ya persistido — nunca se vuelven a
    // tocar (contrato de CapaCostoStock). No escribe Producto.stock.
    private void crearCapa(MovimientoStock movimientoIngreso, Producto producto) {
        CapaCostoStock capa = new CapaCostoStock();
        capa.setProducto(producto);
        capa.setMovimiento(movimientoIngreso);
        capa.setUnidadNegocio(producto.getUnidadNegocio());
        capa.setCantidadOriginal(movimientoIngreso.getCantidad());
        capa.setCantidadRestante(movimientoIngreso.getCantidad());
        capa.setCostoUnitario(movimientoIngreso.getCostoUnitario());
        capa.setFecha(movimientoIngreso.getFecha());
        capaCostoStockRepository.save(capa);
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
                aplicarDesglose(mov, producto, costoBase, null, null);
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
                                  MonedaCosto monedaLinea, BigDecimal cotizacionAplicada) {
        List<ProductoDescuento> descuentos = producto.getDescuentos();

        List<BigDecimal> porcentajes = new ArrayList<>();
        StringBuilder detalle = new StringBuilder();
        if (descuentos != null) {
            for (ProductoDescuento d : descuentos) {
                porcentajes.add(d.getPorcentaje());
                if (detalle.length() > 0) {
                    detalle.append("; ");
                }
                detalle.append(d.getNombre()).append(" ").append(d.getPorcentaje().setScale(2, RoundingMode.HALF_UP)).append("%");
            }
        }

        BigDecimal unidadIva = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getIvaPorcentaje() : null;
        BigDecimal unidadEnvio = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getCostoEnvioPorcentaje() : null;
        BigDecimal ivaEfectivo = CostoCalculator.resolverEfectivo(producto.getIvaPorcentaje(), unidadIva);
        BigDecimal envioEfectivo = CostoCalculator.resolverEfectivo(producto.getCostoEnvioPorcentaje(), unidadEnvio);

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
        mov.setDescuentoDetalle(detalle.length() > 0 ? detalle.toString() : null);
        mov.setIvaPorcentaje(ivaEfectivo);
        mov.setEnvioPorcentaje(envioEfectivo);
        mov.setCostoUnitario(resultado.getCostoUnitario());
        // Congelado de moneda (tarea 7.5): NULL para líneas en pesos (o fuera del contexto de un
        // pedido), informado sólo cuando la conversión efectivamente ocurrió.
        mov.setMonedaOrigen(resultado.getMonedaAplicada());
        mov.setCotizacionAplicada(resultado.getCotizacionAplicada());
    }
}
