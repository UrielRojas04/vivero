package com.vivero.gestion.services.impl;

import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.services.MovimientoStockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
public class MovimientoStockServiceImpl implements MovimientoStockService {

    @Autowired
    private MovimientoStockRepository movimientoStockRepository;

    @Override
    @Transactional
    public MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario) {
        MovimientoStock mov = new MovimientoStock();
        mov.setProducto(producto);
        mov.setUnidadNegocio(producto.getUnidadNegocio());
        mov.setCantidad(cantidad);
        mov.setTipoMovimiento(tipo);
        mov.setUsuario(usuario);
        mov.setFecha(LocalDateTime.now());
        
        BigDecimal costoBase;
        BigDecimal descuentoPerc;
        BigDecimal costoEnvioPerc;
        BigDecimal costoUnitarioFinal;

        if (tipo == TipoMovimientoStock.INGRESO || tipo == TipoMovimientoStock.AJUSTE_INICIAL) {
            costoBase = producto.getCostoProducto() != null ? producto.getCostoProducto() : BigDecimal.ZERO;
            descuentoPerc = producto.getDescuentoProveedor() != null ? producto.getDescuentoProveedor() : BigDecimal.ZERO;
            costoEnvioPerc = producto.getUnidadNegocio() != null && producto.getUnidadNegocio().getCostoEnvioPorcentaje() != null 
                    ? producto.getUnidadNegocio().getCostoEnvioPorcentaje() : BigDecimal.ZERO;

            BigDecimal descuentoMonto = costoBase.multiply(descuentoPerc).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal costoConDescuento = costoBase.subtract(descuentoMonto);
            BigDecimal envioMonto = costoConDescuento.multiply(costoEnvioPerc).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            costoUnitarioFinal = costoConDescuento.add(envioMonto);
        } else {
            MovimientoStock lastIngreso = movimientoStockRepository.findFirstByProductoIdAndTipoMovimientoInOrderByFechaDesc(
                producto.getId(), 
                java.util.Arrays.asList(TipoMovimientoStock.INGRESO, TipoMovimientoStock.AJUSTE_INICIAL)
            );
            
            if (lastIngreso != null) {
                costoBase = lastIngreso.getCostoBase();
                descuentoPerc = lastIngreso.getDescuentoPorcentaje();
                costoEnvioPerc = lastIngreso.getEnvioPorcentaje();
                costoUnitarioFinal = lastIngreso.getCostoUnitario();
            } else {
                costoBase = producto.getCostoProducto() != null ? producto.getCostoProducto() : BigDecimal.ZERO;
                descuentoPerc = producto.getDescuentoProveedor() != null ? producto.getDescuentoProveedor() : BigDecimal.ZERO;
                costoEnvioPerc = producto.getUnidadNegocio() != null && producto.getUnidadNegocio().getCostoEnvioPorcentaje() != null 
                        ? producto.getUnidadNegocio().getCostoEnvioPorcentaje() : BigDecimal.ZERO;
                BigDecimal descuentoMonto = costoBase.multiply(descuentoPerc).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                BigDecimal costoConDescuento = costoBase.subtract(descuentoMonto);
                BigDecimal envioMonto = costoConDescuento.multiply(costoEnvioPerc).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                costoUnitarioFinal = costoConDescuento.add(envioMonto);
            }
        }
        
        mov.setCostoUnitario(costoUnitarioFinal);
        mov.setCostoBase(costoBase);
        mov.setDescuentoPorcentaje(descuentoPerc);
        mov.setEnvioPorcentaje(costoEnvioPerc);
        
        return movimientoStockRepository.save(mov);
    }
}
