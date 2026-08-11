package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.DashboardResumenDTO;
import com.vivero.gestion.dto.VentaLiteDTO;
import com.vivero.gestion.repositories.InsumoRepository;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.VentaDetalleRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.services.FinanzasService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FinanzasServiceImpl implements FinanzasService {

    private final VentaRepository ventaRepository;
    private final VentaDetalleRepository ventaDetalleRepository;
    private final InsumoRepository insumoRepository;
    private final PagoRepository pagoRepository;

    public FinanzasServiceImpl(VentaRepository ventaRepository,
                               VentaDetalleRepository ventaDetalleRepository,
                               InsumoRepository insumoRepository,
                               PagoRepository pagoRepository) {
        this.ventaRepository = ventaRepository;
        this.ventaDetalleRepository = ventaDetalleRepository;
        this.insumoRepository = insumoRepository;
        this.pagoRepository = pagoRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardResumenDTO resumen(LocalDateTime desde, LocalDateTime hasta) {
        BigDecimal totalVentas = ventaRepository.sumarTotalVentas(desde, hasta);
        BigDecimal costoProductosVendidos = ventaDetalleRepository.sumarCostoVendido(desde, hasta);
        BigDecimal gastosInsumos = insumoRepository.sumarGastosInsumos(desde, hasta);
        BigDecimal totalCostos = costoProductosVendidos.add(gastosInsumos);
        BigDecimal gananciaNeta = totalVentas.subtract(totalCostos);
        BigDecimal margen = calcularMargen(gananciaNeta, totalVentas);

        DashboardResumenDTO dto = new DashboardResumenDTO();
        dto.setTotalVentas(totalVentas);
        dto.setTotalCostos(totalCostos);
        dto.setGananciaNeta(gananciaNeta);
        dto.setMargen(margen);
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VentaLiteDTO> listarVentas(LocalDateTime desde, LocalDateTime hasta, Pageable pageable) {
        Page<VentaLiteDTO> ventas = ventaRepository.listarVentasPorRango(desde, hasta, pageable);
        if (ventas.isEmpty()) {
            return ventas;
        }

        Map<Long, String> metodosDePago = pagoRepository.findMetodoPagoPorVenta(desde, hasta).stream()
                .collect(Collectors.toMap(
                        fila -> (Long) fila[0],
                        fila -> (String) fila[1],
                        (existente, nuevo) -> existente,
                        LinkedHashMap::new));

        List<VentaLiteDTO> contenido = ventas.getContent().stream()
                .map(v -> new VentaLiteDTO(
                        v.getId(),
                        v.getNroVenta(),
                        v.getFecha(),
                        v.getClienteNombre(),
                        v.getTotalFinal(),
                        v.getEstadoDePago(),
                        metodosDePago.get(v.getId())))
                .collect(Collectors.toList());

        return new PageImpl<>(contenido, ventas.getPageable(), ventas.getTotalElements());
    }

    private BigDecimal calcularMargen(BigDecimal gananciaNeta, BigDecimal totalVentas) {
        if (totalVentas == null || totalVentas.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return gananciaNeta.multiply(BigDecimal.valueOf(100))
                .divide(totalVentas, 2, RoundingMode.HALF_UP);
    }
}