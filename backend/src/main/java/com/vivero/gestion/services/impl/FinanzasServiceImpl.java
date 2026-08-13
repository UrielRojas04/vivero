package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.DashboardResumenDTO;
import com.vivero.gestion.dto.VentaLiteDTO;
import com.vivero.gestion.repositories.GastoRepository;
import com.vivero.gestion.repositories.InsumoRepository;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.VentaDetalleRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.repositories.ChequeRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.models.Gasto;
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
    private final GastoRepository gastoRepository;
    private final ChequeRepository chequeRepository;
    private final ProductoRepository productoRepository;

    public FinanzasServiceImpl(VentaRepository ventaRepository,
                               VentaDetalleRepository ventaDetalleRepository,
                               InsumoRepository insumoRepository,
                               PagoRepository pagoRepository,
                               GastoRepository gastoRepository,
                               ChequeRepository chequeRepository,
                               ProductoRepository productoRepository) {
        this.ventaRepository = ventaRepository;
        this.ventaDetalleRepository = ventaDetalleRepository;
        this.insumoRepository = insumoRepository;
        this.pagoRepository = pagoRepository;
        this.gastoRepository = gastoRepository;
        this.chequeRepository = chequeRepository;
        this.productoRepository = productoRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardResumenDTO resumen(LocalDateTime desde, LocalDateTime hasta) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        BigDecimal totalVentas = ventaRepository.sumarTotalVentas(desde, hasta, unidadId);
        
        BigDecimal gastosInsumos = BigDecimal.ZERO;
        if (unidadId == null || unidadId == 1L) {
            BigDecimal sum = insumoRepository.sumarGastosInsumos(desde, hasta);
            if (sum != null) gastosInsumos = sum;
        }

        if (unidadId != null && unidadId == 2L) {
            BigDecimal cogs = ventaDetalleRepository.sumarCostoMercaderiaVendida(desde, hasta, unidadId);
            if (cogs != null) gastosInsumos = gastosInsumos.add(cogs);
        }

        List<Gasto> gastos;
        if (unidadId != null) {
            gastos = gastoRepository.findByUnidadNegocioIdAndFechaBetween(unidadId, desde, hasta);
        } else {
            gastos = gastoRepository.findByFechaBetween(desde, hasta);
        }
        BigDecimal totalGastos = gastos.stream()
                .map(Gasto::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCostos = gastosInsumos.add(totalGastos);
        BigDecimal gananciaNeta = totalVentas.subtract(totalCostos);
        BigDecimal margen = calcularMargen(gananciaNeta, totalVentas);
        
        BigDecimal chequesEnCartera;
        if (unidadId != null) {
            chequesEnCartera = chequeRepository.sumarChequesEnCarteraByUnidadNegocioId(unidadId);
        } else {
            chequesEnCartera = chequeRepository.sumarChequesEnCartera();
        }

        DashboardResumenDTO dto = new DashboardResumenDTO();
        dto.setTotalVentas(totalVentas);
        dto.setTotalCostos(totalCostos);
        dto.setGananciaNeta(gananciaNeta);
        dto.setMargen(margen);
        dto.setChequesEnCartera(chequesEnCartera);
        dto.setCostoMercaderiaVendida(gastosInsumos);
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VentaLiteDTO> listarVentas(LocalDateTime desde, LocalDateTime hasta, String q, Pageable pageable) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        Page<VentaLiteDTO> ventas = ventaRepository.listarVentasPorRango(desde, hasta, q, unidadId, pageable);
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
                        metodosDePago.get(v.getId()),
                        v.getGananciaNeta()))
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

    @Override
    @Transactional(readOnly = true)
    public List<com.vivero.gestion.dto.VentaDetalleResponseDTO> listarDetalleCogs(LocalDateTime desde, LocalDateTime hasta) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<com.vivero.gestion.models.VentaDetalle> detalles = (unidadId != null)
                ? ventaDetalleRepository.findByVentaFechaBetweenAndVentaUnidadNegocioId(desde, hasta, unidadId)
                : ventaDetalleRepository.findByVentaFechaBetween(desde, hasta);

        return detalles.stream()
                .sorted((d1, d2) -> d2.getVenta().getFecha().compareTo(d1.getVenta().getFecha()))
                .map(d -> {
            com.vivero.gestion.dto.VentaDetalleResponseDTO dDto = new com.vivero.gestion.dto.VentaDetalleResponseDTO();
            dDto.setId(d.getId());
            if (d.getProducto() != null) {
                dDto.setProductoId(d.getProducto().getId());
                dDto.setProductoNombre(d.getProducto().getNombre());
            }
            dDto.setCantidad(d.getCantidad());
            dDto.setPrecioUnitarioHistorico(d.getPrecioUnitarioHistorico());
            dDto.setCostoUnitarioHistorico(d.getCostoUnitarioHistorico());
            dDto.setCostoBaseHistorico(d.getCostoBaseHistorico());
            dDto.setDescuentoPorcentajeHistorico(d.getDescuentoPorcentajeHistorico());
            dDto.setEnvioPorcentajeHistorico(d.getEnvioPorcentajeHistorico());
            dDto.setSubtotal(d.getSubtotal());
            return dDto;
        }).collect(Collectors.toList());
    }
}