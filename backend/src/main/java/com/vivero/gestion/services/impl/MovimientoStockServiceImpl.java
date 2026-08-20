package com.vivero.gestion.services.impl;

import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.ProductoDescuento;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.services.CostoCalculator;
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
            aplicarDesglose(mov, producto, costoBase);
        } else {
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
                aplicarDesglose(mov, producto, costoBase);
            }
        }

        return movimientoStockRepository.save(mov);
    }

    private void aplicarDesglose(MovimientoStock mov, Producto producto, BigDecimal costoBase) {
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

        CostoCalculator.CostoResultado resultado = CostoCalculator.calcular(costoBase, porcentajes, ivaEfectivo, envioEfectivo);

        mov.setCostoBase(costoBase);
        mov.setCostoNeto(resultado.getNetoConDescuentos());
        mov.setDescuentoPorcentaje(resultado.getDescuentoEfectivoPorcentaje());
        mov.setDescuentoDetalle(detalle.length() > 0 ? detalle.toString() : null);
        mov.setIvaPorcentaje(ivaEfectivo);
        mov.setEnvioPorcentaje(envioEfectivo);
        mov.setCostoUnitario(resultado.getCostoUnitario());
    }
}
