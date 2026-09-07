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
            // (excluyendo productos físicos que ya tienen dueño asignado distinto a 'Jefe')
            List<StockPorNegocioDTO> stockVivero = productoRepository.findStockFisicoDisponible(1L);
            Map<String, Integer> mapFisico = stockVivero.stream()
                    .collect(Collectors.toMap(StockPorNegocioDTO::getProductoNombre, StockPorNegocioDTO::getCantidad));

            // 2. Obtenemos las siembras en proceso que ya casi están listas (<= 7 días)
            List<Object[]> siembrasProximas = siembraRepository.sumBandejasEnProcesoProximas(java.time.LocalDate.now().plusDays(7));
            Map<String, Integer> mapSiembrasProximas = new java.util.HashMap<>();
            Map<String, Integer> mapDiasCosecha = new java.util.HashMap<>();
            java.time.LocalDate hoy = java.time.LocalDate.now();
            
            for (Object[] obj : siembrasProximas) {
                if (obj[0] != null) {
                    String variedad = (String) obj[0];
                    mapSiembrasProximas.put(variedad, obj[1] != null ? ((Number) obj[1]).intValue() : 0);
                    
                    if (obj[2] != null) {
                        java.time.LocalDate fechaEstimada = null;
                        if (obj[2] instanceof java.sql.Date) {
                            fechaEstimada = ((java.sql.Date) obj[2]).toLocalDate();
                        } else if (obj[2] instanceof java.time.LocalDate) {
                            fechaEstimada = (java.time.LocalDate) obj[2];
                        }
                        
                        if (fechaEstimada != null) {
                            int dias = (int) java.time.temporal.ChronoUnit.DAYS.between(hoy, fechaEstimada);
                            if (dias < 0) dias = 0; // Si ya pasó la fecha
                            mapDiasCosecha.put(variedad, dias);
                        }
                    }
                }
            }

            // 3. Obtenemos las bandejas encargadas (RegistroSemilla activos)
            List<Object[]> encargadasPorVariedad = registroSemillaRepository.sumBandejasEncargadasPorVariedad();
            Map<String, Integer> mapEncargadas = new java.util.HashMap<>();
            for (Object[] obj : encargadasPorVariedad) {
                if (obj[0] != null) {
                    mapEncargadas.put((String) obj[0], obj[1] != null ? ((Number) obj[1]).intValue() : 0);
                }
            }

            // 4. Cruzamos los datos y calculamos lo disponible (Fisico + Siembras - Encargadas)
            java.util.Set<String> todasLasVariedades = new java.util.HashSet<>();
            for (StockPorNegocioDTO s : stockVivero) {
                if (s.getProductoNombre() != null) todasLasVariedades.add(s.getProductoNombre());
            }
            todasLasVariedades.addAll(mapSiembrasProximas.keySet());

            return todasLasVariedades.stream().map(nombre -> {
                int stockFisico = mapFisico.getOrDefault(nombre, 0);
                int siembras = mapSiembrasProximas.getOrDefault(nombre, 0);
                int fisicoYProximo = stockFisico + siembras;
                int encargadas = mapEncargadas.getOrDefault(nombre, 0);
                
                Integer diasCosecha = null;
                if (stockFisico == 0 && siembras > 0) {
                    diasCosecha = mapDiasCosecha.get(nombre);
                }
                
                return new BandejasDisponiblesDTO(nombre, fisicoYProximo, encargadas, fisicoYProximo - encargadas, diasCosecha);
            }).collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR IN BANDEJAS DISPONIBLES: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
}
