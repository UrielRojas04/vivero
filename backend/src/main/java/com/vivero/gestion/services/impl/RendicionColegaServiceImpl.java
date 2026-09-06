package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.DireccionRendicion;
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
import com.vivero.gestion.dto.RendicionRequestDTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
public class RendicionColegaServiceImpl implements RendicionColegaService {

    private final RendicionColegaRepository rendicionRepository;
    private final PagoRepository pagoRepository;
    private final VentaRepository ventaRepository;
    private final InsumoRepository insumoRepository;
    private final GastoRepository gastoRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final UsuarioRepository usuarioRepository;

    @Autowired
    public RendicionColegaServiceImpl(RendicionColegaRepository rendicionRepository,
                                      PagoRepository pagoRepository,
                                      VentaRepository ventaRepository,
                                      InsumoRepository insumoRepository,
                                      GastoRepository gastoRepository,
                                      UnidadNegocioRepository unidadNegocioRepository,
                                      UsuarioRepository usuarioRepository) {
        this.rendicionRepository = rendicionRepository;
        this.pagoRepository = pagoRepository;
        this.ventaRepository = ventaRepository;
        this.insumoRepository = insumoRepository;
        this.gastoRepository = gastoRepository;
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
    public void registrarRendicion(RendicionRequestDTO request) {
        BigDecimal monto = request != null ? request.getMonto() : null;
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto de la rendición debe ser mayor a cero");
        }

        // Simplificado 2026-09-04 (pedido del dueño): la dirección ya no se elige a mano en el
        // formulario -- se deriva automáticamente de la cuenta del usuario autenticado
        // (CuentaAbonoContextHolder, poblado por CuentaAbonoFilter según el username: Sergio
        // -> JEFE, Pablo -> COLEGA). Si estoy logueado como Jefe, la rendición sólo puede
        // ser Jefe->Colega; si estoy logueado como Colega, sólo Colega->Jefe. Mismo criterio de "nunca
        // caer en un default silencioso" que ya usa CuentaAbonoFilter: si el contexto no está resuelto
        // (un tercer usuario que no es ni jefe ni colega), se rechaza en vez de asumir una dirección.
        CuentaAbono cuenta = com.vivero.gestion.security.CuentaAbonoContextHolder.getCuentaAbono();
        if (cuenta == null) {
            throw new IllegalArgumentException(
                    "No se pudo determinar la cuenta (Jefe/Colega) del usuario autenticado para registrar la rendición");
        }
        DireccionRendicion direccion = cuenta == CuentaAbono.JEFE
                ? DireccionRendicion.JEFE_A_COLEGA
                : DireccionRendicion.COLEGA_A_JEFE;

        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new RuntimeException("Unidad de negocio Abono no encontrada"));

        LocalDateTime fecha;
        if (request.getFecha() != null && !request.getFecha().isBlank()) {
            fecha = LocalDate.parse(request.getFecha())
                    .atStartOfDay(ZoneId.of("America/Argentina/Buenos_Aires"))
                    .toLocalDateTime();
        } else {
            fecha = LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires"));
        }

        RendicionColega rendicion = new RendicionColega();
        rendicion.setMonto(monto);
        rendicion.setFecha(fecha);
        rendicion.setObservacion(request.getObservacion());
        rendicion.setDireccion(direccion);
        rendicion.setMedioPago(request.getMedioPago());
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
        
        // Bug real corregido 2026-09-04: "gastosInsumos" sólo sumaba insumos -- los gastos
        // manuales cargados desde el drill-down de Finanzas (GastosDrillDown.jsx, mismo
        // componente que en Vivero) nunca se reflejaban en este total, aunque sí aparecían en la
        // lista. Se suman también acá, con el mismo criterio de unidad/período que ya usa el
        // resto del método (ver RendicionColegaLiquidacionGastosManualesTest).
        BigDecimal gastosInsumos = insumoRepository.sumarGastosInsumos(desde, hasta, abono.getId());
        BigDecimal gastosManuales = gastoRepository.findByUnidadNegocioIdAndFechaBetween(abono.getId(), desde, hasta)
                .stream()
                .map(com.vivero.gestion.models.Gasto::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        gastosInsumos = gastosInsumos.add(gastosManuales);
        BigDecimal rendiciones = rendicionRepository.sumarRendicionesPorUnidadYPeriodo(abono.getId(), desde, hasta);
        
        BigDecimal saldoCajaColega = ingresosColega.subtract(rendiciones);
        
        // Ingresos netos = Ingresos Totales (Cobros) - Gastos Insumos
        BigDecimal ingresosNetos = ingresosJefe.add(ingresosColega).subtract(gastosInsumos);
        
        // Compensación teórica: lo que le corresponde al colega del neto cobrado
        // Asumimos un 50% por default si no está seteado o configurado en la unidad (porcentajeRepartoColega)
        BigDecimal porcentajeColega = abono.getPorcentajeRepartoColega() != null ?
                abono.getPorcentajeRepartoColega() : BigDecimal.ZERO;

        // Modo de reparto (pedido del dueño 2026-09-04, decisión confirmada explícitamente):
        // - Global (default, repartoSobreVentasColega=false): el porcentaje aplica sobre el
        //   ingreso neto combinado (Jefe + Colega - gastos), como siempre.
        // - Ventas del colega (repartoSobreVentasColega=true): el porcentaje aplica directo sobre
        //   lo que el colega cobró, SIN restar gastos/insumos -- esos quedan a cargo del Jefe en
        //   este modo.
        BigDecimal baseCompensacion = abono.isRepartoSobreVentasColega() ? ingresosColega : ingresosNetos;
        BigDecimal compensacionTeorica = baseCompensacion.multiply(porcentajeColega).divide(BigDecimal.valueOf(100));
        
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
                
        return rendicionRepository.findAllByUnidadNegocioIdOrderByFechaDescIdDesc(abono.getId(), pageable)
                .map(r -> new RendicionColegaDTO(
                        r.getId(),
                        r.getMonto(),
                        r.getFecha(),
                        r.getObservacion(),
                        r.getUsuario() != null ? r.getUsuario().getUsername() : null,
                        r.getDireccion() != null ? r.getDireccion().name() : "COLEGA_A_JEFE",
                        r.getMedioPago()
                ));
    }
}
