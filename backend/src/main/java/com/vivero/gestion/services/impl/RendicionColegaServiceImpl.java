package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.RendicionColega;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.*;
import org.springframework.security.core.context.SecurityContextHolder;
import com.vivero.gestion.services.RendicionColegaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.vivero.gestion.dto.RendicionColegaDTO;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
public class RendicionColegaServiceImpl implements RendicionColegaService {

    private final RendicionColegaRepository rendicionRepository;
    private final PagoRepository pagoRepository;
    private final VentaRepository ventaRepository;
    private final InsumoRepository insumoRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final UsuarioRepository usuarioRepository;

    @Autowired
    public RendicionColegaServiceImpl(RendicionColegaRepository rendicionRepository,
                                      PagoRepository pagoRepository,
                                      VentaRepository ventaRepository,
                                      InsumoRepository insumoRepository,
                                      UnidadNegocioRepository unidadNegocioRepository,
                                      UsuarioRepository usuarioRepository) {
        this.rendicionRepository = rendicionRepository;
        this.pagoRepository = pagoRepository;
        this.ventaRepository = ventaRepository;
        this.insumoRepository = insumoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.usuarioRepository = usuarioRepository;
    }

    private Usuario getUsuarioAutenticado() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    @Override
    @Transactional
    public void registrarRendicion(BigDecimal monto, String observacion) {
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto de la rendición debe ser mayor a cero");
        }

        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new RuntimeException("Unidad de negocio Abono no encontrada"));

        RendicionColega rendicion = new RendicionColega();
        rendicion.setMonto(monto);
        rendicion.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        rendicion.setObservacion(observacion);
        rendicion.setUsuario(getUsuarioAutenticado());
        rendicion.setUnidadNegocio(abono);

        rendicionRepository.save(rendicion);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal obtenerSaldoCajaColega() {
        // Since we don't have a specific period, we calculate from the beginning of time
        LocalDateTime epoch = LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime now = LocalDateTime.now();

        BigDecimal ingresosColega = pagoRepository.sumarPagosPorCuentaYPeriodo(CuentaAbono.COLEGA, epoch, now);
        
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono").orElse(null);
        BigDecimal rendiciones = abono != null ? rendicionRepository.sumarRendicionesPorUnidad(abono.getId()) : BigDecimal.ZERO;

        return ingresosColega.subtract(rendiciones);
    }

    @Override
    @Transactional(readOnly = true)
    public LiquidacionAbonoDTO obtenerLiquidacion(LocalDateTime desde, LocalDateTime hasta) {
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new RuntimeException("Unidad de negocio Abono no encontrada"));
        
        BigDecimal ventasJefe = ventaRepository.sumarTotalVentasPorCuentaYPeriodo(CuentaAbono.JEFE, desde, hasta);
        BigDecimal ventasColega = ventaRepository.sumarTotalVentasPorCuentaYPeriodo(CuentaAbono.COLEGA, desde, hasta);
        
        BigDecimal ingresosJefe = pagoRepository.sumarPagosPorCuentaYPeriodo(CuentaAbono.JEFE, desde, hasta);
        BigDecimal ingresosColega = pagoRepository.sumarPagosPorCuentaYPeriodo(CuentaAbono.COLEGA, desde, hasta);
        
        BigDecimal gastosInsumos = insumoRepository.sumarGastosInsumos(desde, hasta, abono.getId());
        BigDecimal rendiciones = rendicionRepository.sumarRendicionesPorUnidadYPeriodo(abono.getId(), desde, hasta);
        
        BigDecimal saldoCajaColega = ingresosColega.subtract(rendiciones);
        
        // Ingresos netos = Ingresos Totales (Cobros) - Gastos Insumos
        BigDecimal ingresosNetos = ingresosJefe.add(ingresosColega).subtract(gastosInsumos);
        
        // Compensación teórica: lo que le corresponde al colega del neto cobrado
        // Asumimos un 50% por default si no está seteado o configurado en la unidad (porcentajeRepartoColega)
        BigDecimal porcentajeColega = abono.getPorcentajeRepartoColega() != null ? 
                abono.getPorcentajeRepartoColega() : BigDecimal.ZERO;
        
        BigDecimal compensacionTeorica = ingresosNetos.multiply(porcentajeColega).divide(BigDecimal.valueOf(100));
        
        LiquidacionAbonoDTO dto = new LiquidacionAbonoDTO();
        dto.setVentasJefe(ventasJefe);
        dto.setVentasColega(ventasColega);
        dto.setIngresosJefe(ingresosJefe);
        dto.setIngresosColega(ingresosColega);
        dto.setGastosInsumos(gastosInsumos);
        dto.setRendicionesEntregadas(rendiciones);
        dto.setSaldoCajaColega(saldoCajaColega);
        dto.setCompensacionTeorica(compensacionTeorica);
        
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RendicionColegaDTO> obtenerHistorialRendiciones(Pageable pageable) {
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new RuntimeException("Unidad de negocio Abono no encontrada"));
                
        return rendicionRepository.findAllByUnidadNegocioIdOrderByFechaDesc(abono.getId(), pageable)
                .map(r -> new RendicionColegaDTO(
                        r.getId(),
                        r.getMonto(),
                        r.getFecha(),
                        r.getObservacion(),
                        r.getUsuario() != null ? r.getUsuario().getUsername() : null
                ));
    }
}
