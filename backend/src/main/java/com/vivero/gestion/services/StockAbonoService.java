package com.vivero.gestion.services;

import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.Venta;

import java.util.List;
import com.vivero.gestion.dto.StockConsolidadoAbonoDTO;
import com.vivero.gestion.dto.MovimientoStockAbonoDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StockAbonoService {
    void registrarProduccion(Long productoId, Integer cantidad);
    void registrarTraslado(Long productoId, Integer cantidad, String direccion);
    void registrarVenta(Long productoId, Integer cantidad, CuentaAbono cuenta, Venta venta);
    void registrarAjuste(Long productoId, Integer cantidad, CuentaAbono cuenta);
    List<StockConsolidadoAbonoDTO> obtenerStockConsolidado();
    Page<MovimientoStockAbonoDTO> obtenerHistorialMovimientos(Long productoId, List<com.vivero.gestion.models.TipoMovimientoStockAbono> tipos, Pageable pageable);
}
