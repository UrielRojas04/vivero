package com.vivero.gestion.services;

import com.vivero.gestion.dto.BandejasDisponiblesDTO;
import com.vivero.gestion.dto.StockPorNegocioDTO;
import java.util.List;

public interface EstadisticasService {
    List<StockPorNegocioDTO> obtenerStockPorNegocio(Long unidadNegocioId);
    List<StockPorNegocioDTO> obtenerStockCritico(Long unidadNegocioId, int limit);
    List<BandejasDisponiblesDTO> obtenerBandejasDisponibles();
}
