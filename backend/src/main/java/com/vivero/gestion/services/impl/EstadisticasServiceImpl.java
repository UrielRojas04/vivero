package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.BandejasDisponiblesDTO;
import com.vivero.gestion.dto.StockPorNegocioDTO;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.RegistroSemillaRepository;
import com.vivero.gestion.services.EstadisticasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class EstadisticasServiceImpl implements EstadisticasService {

    private final ProductoRepository productoRepository;
    private final RegistroSemillaRepository registroSemillaRepository;
    private final com.vivero.gestion.repositories.SiembraRepository siembraRepository;

    @Autowired
    public EstadisticasServiceImpl(ProductoRepository productoRepository, RegistroSemillaRepository registroSemillaRepository, com.vivero.gestion.repositories.SiembraRepository siembraRepository) {
        this.productoRepository = productoRepository;
        this.registroSemillaRepository = registroSemillaRepository;
        this.siembraRepository = siembraRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockPorNegocioDTO> obtenerStockPorNegocio(Long unidadNegocioId) {
        return productoRepository.findStockPorNegocio(unidadNegocioId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockPorNegocioDTO> obtenerStockCritico(Long unidadNegocioId, int limit) {
        return productoRepository.findStockCritico(unidadNegocioId, org.springframework.data.domain.PageRequest.of(0, limit));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BandejasDisponiblesDTO> obtenerBandejasDisponibles() {
        try {
            // 1. Obtenemos el stock físico total DISPONIBLE de la unidad Vivero (id=1)
            List<StockPorNegocioDTO> stockVivero = productoRepository.findStockFisicoDisponible(1L);

            // 2. Obtenemos las siembras en proceso próximas a salir (dueño JEFE)
            java.time.LocalDate hoy = java.time.LocalDate.now();
            java.time.LocalDate limite = hoy.plusDays(7);
            List<Object[]> siembrasProximas = siembraRepository.sumBandejasEnProcesoProximas(limite);
            
            // mapSiembrasProximas agrupa solo por variedad
            Map<String, Integer> mapSiembrasProximas = new java.util.HashMap<>();
            Map<String, Integer> mapDiasCosecha = new java.util.HashMap<>();
            if (siembrasProximas != null) {
                for (Object[] obj : siembrasProximas) {
                    if (obj[0] == null || obj[1] == null) continue;
                    String variedad = (String) obj[0];
                    mapSiembrasProximas.put(variedad, ((Number) obj[1]).intValue());
                    
                    if (obj[2] != null) {
                        java.time.LocalDate fechaEstimada = null;
                        if (obj[2] instanceof java.sql.Date) {
                            fechaEstimada = ((java.sql.Date) obj[2]).toLocalDate();
                        } else if (obj[2] instanceof java.time.LocalDate) {
                            fechaEstimada = (java.time.LocalDate) obj[2];
                        }
                        
                        if (fechaEstimada != null) {
                            int dias = (int) java.time.temporal.ChronoUnit.DAYS.between(hoy, fechaEstimada);
                            if (dias < 0) dias = 0;
                            mapDiasCosecha.put(variedad, dias);
                        }
                    }
                }
            }

            // 3. Generamos los DTOs agrupando stock físico por (variedad, esDevolucion, duenoAnterior)
            List<BandejasDisponiblesDTO> resultado = new java.util.ArrayList<>();
            java.util.Set<String> variedadesConFisicoNormal = new java.util.HashSet<>();

            // Agrupar stock físico
            Map<String, Integer> mapFisicoAgrupado = new java.util.HashMap<>();
            for (StockPorNegocioDTO s : stockVivero) {
                if (s.getProductoNombre() == null) continue;
                String key = s.getProductoNombre() + "|" + s.isEsDevolucion() + "|" + (s.getDuenoAnterior() != null ? s.getDuenoAnterior() : "");
                mapFisicoAgrupado.put(key, mapFisicoAgrupado.getOrDefault(key, 0) + s.getCantidad());
            }

            // Convertir agrupaciones a DTOs
            for (StockPorNegocioDTO s : stockVivero) {
                if (s.getProductoNombre() == null) continue;
                String key = s.getProductoNombre() + "|" + s.isEsDevolucion() + "|" + (s.getDuenoAnterior() != null ? s.getDuenoAnterior() : "");
                if (mapFisicoAgrupado.containsKey(key)) {
                    int cantidad = mapFisicoAgrupado.remove(key);
                    
                    if (!s.isEsDevolucion()) {
                        variedadesConFisicoNormal.add(s.getProductoNombre());
                        // Sumamos las siembras a las bandejas normales
                        int siembras = mapSiembrasProximas.getOrDefault(s.getProductoNombre(), 0);
                        resultado.add(new BandejasDisponiblesDTO(s.getProductoNombre(), cantidad + siembras, 0, cantidad + siembras, null, s.getDuenoAnterior(), s.isEsDevolucion()));
                    } else {
                        resultado.add(new BandejasDisponiblesDTO(s.getProductoNombre(), cantidad, 0, cantidad, null, s.getDuenoAnterior(), s.isEsDevolucion()));
                    }
                }
            }

            // Añadir siembras próximas para variedades que NO tuvieron stock físico normal
            for (Map.Entry<String, Integer> entry : mapSiembrasProximas.entrySet()) {
                if (!variedadesConFisicoNormal.contains(entry.getKey())) {
                    resultado.add(new BandejasDisponiblesDTO(entry.getKey(), entry.getValue(), 0, entry.getValue(), mapDiasCosecha.get(entry.getKey()), null, false));
                }
            }

            return resultado;
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR IN BANDEJAS DISPONIBLES: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
}
