package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.DireccionRendicion;
import com.vivero.gestion.models.RendicionColega;
import com.vivero.gestion.models.RetiroGananciaAbono;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.*;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import com.vivero.gestion.security.CuentaAbonoNombres;
import org.springframework.security.core.context.SecurityContextHolder;
import com.vivero.gestion.services.RendicionColegaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.vivero.gestion.dto.GananciaDisponibleAbonoDTO;
import com.vivero.gestion.dto.RendicionColegaDTO;
import com.vivero.gestion.dto.RendicionRequestDTO;
import com.vivero.gestion.dto.RetiroGananciaDTO;
import com.vivero.gestion.dto.RetiroGananciaRequestDTO;

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
    private final RetiroGananciaAbonoRepository retiroGananciaAbonoRepository;

    @Autowired
    public RendicionColegaServiceImpl(RendicionColegaRepository rendicionRepository,
                                      PagoRepository pagoRepository,
                                      VentaRepository ventaRepository,
                                      InsumoRepository insumoRepository,
                                      GastoRepository gastoRepository,
                                      UnidadNegocioRepository unidadNegocioRepository,
                                      UsuarioRepository usuarioRepository,
                                      RetiroGananciaAbonoRepository retiroGananciaAbonoRepository) {
        this.rendicionRepository = rendicionRepository;
        this.pagoRepository = pagoRepository;
        this.ventaRepository = ventaRepository;
        this.insumoRepository = insumoRepository;
        this.gastoRepository = gastoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.usuarioRepository = usuarioRepository;
        this.retiroGananciaAbonoRepository = retiroGananciaAbonoRepository;
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
        // Auditoría 2026-09-09 (pedido del dueño, "que no queden cabos sueltos"): este endpoint no
        // se usa hoy desde ningún lado del frontend, pero quedaba con el mismo bug ya corregido en
        // obtenerLiquidacionAcumulada() -- no restaba los retiros de ganancia. Se corrige acá
        // también para que, si algún día se vuelve a usar, no reintroduzca la misma inconsistencia
        // ("saldo en caja" con y sin retiros conviviendo en pantallas distintas).
        BigDecimal retirosColega = abono != null
                ? retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono.getId(), CuentaAbono.COLEGA)
                : BigDecimal.ZERO;

        return ingresosColega.subtract(rendiciones).subtract(retirosColega);
    }

    /**
     * Ingresos, gastos y reparto teórico del colega para un rango de fechas dado -- extraído en
     * la tarea 4.7 de tasks.md de retiro-ganancia-abono: obtenerLiquidacion (por período) y
     * obtenerGananciaDisponible (acumulado, época->ahora) resolvían exactamente la misma fórmula
     * dos veces. Refactor puro: no cambia ningún valor devuelto por obtenerLiquidacion (los 5
     * tests de baseline de tasks.md grupo 1 siguen en su baseline exacto después de este cambio).
     */
    private record ReparticionAbono(BigDecimal ingresosJefe, BigDecimal ingresosColega,
                                     BigDecimal gastosTotal, BigDecimal ingresosNetos,
                                     BigDecimal compensacionColega) {}

    private ReparticionAbono calcularReparticion(UnidadNegocio abono, LocalDateTime desde, LocalDateTime hasta) {
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
        BigDecimal gastosTotal = gastosInsumos.add(gastosManuales);

        // Ingresos netos = Ingresos Totales (Cobros) - Gastos (insumos + manuales)
        BigDecimal ingresosNetos = ingresosJefe.add(ingresosColega).subtract(gastosTotal);

        // Compensación teórica: lo que le corresponde al colega del neto cobrado.
        BigDecimal porcentajeColega = abono.getPorcentajeRepartoColega() != null ?
                abono.getPorcentajeRepartoColega() : BigDecimal.ZERO;

        // Modo de reparto (pedido del dueño 2026-09-04, decisión confirmada explícitamente):
        // - Global (default, repartoSobreVentasColega=false): el porcentaje aplica sobre el
        //   ingreso neto combinado (Jefe + Colega - gastos), como siempre.
        // - Ventas del colega (repartoSobreVentasColega=true): el porcentaje aplica directo sobre
        //   lo que el colega cobró, SIN restar gastos/insumos -- esos quedan a cargo del Jefe en
        //   este modo.
        BigDecimal baseCompensacion = abono.isRepartoSobreVentasColega() ? ingresosColega : ingresosNetos;
        BigDecimal compensacionColega = baseCompensacion.multiply(porcentajeColega).divide(BigDecimal.valueOf(100));

        return new ReparticionAbono(ingresosJefe, ingresosColega, gastosTotal, ingresosNetos, compensacionColega);
    }

    /**
     * Arma el LiquidacionAbonoDTO completo (ventas, ingresos, gastos, rendiciones, saldo de caja,
     * compensación teórica) para el rango de fechas dado. Extraído al agregar
     * obtenerLiquidacionAcumulada(): antes de este refactor, obtenerLiquidacion(desde, hasta) y
     * obtenerLiquidacionAcumulada() resolvían exactamente la misma secuencia dos veces, cambiando
     * sólo el rango -- mismo criterio que ya se usó para extraer calcularReparticion (tarea 4.7 de
     * retiro-ganancia-abono). Refactor puro: no cambia ningún valor devuelto por obtenerLiquidacion
     * (los tests de baseline de la sección 0 siguen en su baseline exacto después de este cambio).
     */
    private LiquidacionAbonoDTO construirLiquidacion(UnidadNegocio abono, LocalDateTime desde, LocalDateTime hasta) {
        BigDecimal ventasJefe = ventaRepository.sumarTotalVentasPorCuentaYPeriodo(CuentaAbono.JEFE, desde, hasta);
        BigDecimal ventasColega = ventaRepository.sumarTotalVentasPorCuentaYPeriodo(CuentaAbono.COLEGA, desde, hasta);

        ReparticionAbono reparticion = calcularReparticion(abono, desde, hasta);

        BigDecimal rendiciones = rendicionRepository.sumarRendicionesPorUnidadYPeriodo(abono.getId(), desde, hasta);
        BigDecimal saldoCajaColega = reparticion.ingresosColega().subtract(rendiciones);

        LiquidacionAbonoDTO dto = new LiquidacionAbonoDTO();
        dto.setVentasJefe(ventasJefe);
        dto.setVentasColega(ventasColega);
        dto.setIngresosJefe(reparticion.ingresosJefe());
        dto.setIngresosColega(reparticion.ingresosColega());
        dto.setGastosInsumos(reparticion.gastosTotal());
        dto.setRendicionesEntregadas(rendiciones);
        dto.setSaldoCajaColega(saldoCajaColega);
        dto.setCompensacionTeorica(reparticion.compensacionColega());
        // Bug real corregido (2026-09-08, reportado por el dueño): LiquidacionAbono.jsx mostraba
        // el % de reparto sólo si el usuario logueado tenía ADMIN_DB (fetch aparte a Configuración);
        // sin ese permiso caía a un default hardcodeado de 50%, aunque el reparto real configurado
        // fuera otro (ej. 40%) -- el número SÍ se calculaba bien, pero la etiqueta mentía. Se expone
        // acá para que cualquiera que vea la liquidación vea el % real, sin depender de un permiso
        // aparte para un dato que ya forma parte de este mismo cálculo.
        dto.setPorcentajeRepartoColega(
                abono.getPorcentajeRepartoColega() != null ? abono.getPorcentajeRepartoColega() : BigDecimal.ZERO);

        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public LiquidacionAbonoDTO obtenerLiquidacion(LocalDateTime desde, LocalDateTime hasta) {
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new RuntimeException("Unidad de negocio Abono no encontrada"));

        return construirLiquidacion(abono, desde, hasta);
    }

    @Override
    @Transactional(readOnly = true)
    public LiquidacionAbonoDTO obtenerLiquidacionAcumulada() {
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new RuntimeException("Unidad de negocio Abono no encontrada"));

        // Pedido del dueño (chat, sin filtro de mes/año): mismo truco de rango que ya usan
        // obtenerSaldoCajaColega() y obtenerGananciaDisponible() -- época (2000-01-01) -> ahora en
        // vez de un desde/hasta elegido por el usuario. sumarRendicionesPorUnidadYPeriodo(id,
        // epoch, ahora) dentro de construirLiquidacion es equivalente a sumarRendicionesPorUnidad
        // (sin filtro) siempre que no exista una rendición sembrada antes del año 2000 -- supuesto
        // seguro para este sistema.
        LocalDateTime epoch = LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime ahora = LocalDateTime.now();

        LiquidacionAbonoDTO dto = construirLiquidacion(abono, epoch, ahora);

        // Bug real corregido (2026-09-08, reportado por el dueño): "saldo en caja" no bajaba al
        // hacer un retiro de ganancia -- `saldoCajaColega` sólo restaba `rendicionesEntregadas`
        // (plata que Pablo le da a Sergio), pero un retiro de ganancia es la MISMA clase de evento
        // (plata que sale de lo que Pablo tiene en la mano), sólo que se la queda él en vez de
        // dársela a Sergio. Sin esto, "Ajuste de Cuentas" seguía pidiéndole a Pablo la plata que ya
        // había retirado como propia, como si nunca hubiera salido de su bolsillo.
        BigDecimal retirosJefe = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono.getId(), CuentaAbono.JEFE);
        BigDecimal retirosColega = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono.getId(), CuentaAbono.COLEGA);

        dto.setRetirosAcumuladosJefe(retirosJefe);
        dto.setRetirosAcumuladosColega(retirosColega);
        dto.setSaldoCajaColega(dto.getSaldoCajaColega().subtract(retirosColega));

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

    @Override
    @Transactional
    public void registrarRetiroGanancia(RetiroGananciaRequestDTO request) {
        BigDecimal monto = request != null ? request.getMonto() : null;
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto del retiro de ganancia debe ser mayor a cero");
        }

        // Mismo criterio que registrarRendicion: la cuenta NUNCA se recibe en el request, se
        // deriva de CuentaAbonoContextHolder. Si no está resuelta (un tercer usuario que no es ni
        // jefe ni colega), se rechaza en vez de asumir una cuenta por defecto.
        CuentaAbono cuenta = CuentaAbonoContextHolder.getCuentaAbono();
        if (cuenta == null) {
            throw new IllegalArgumentException(
                    "No se pudo determinar la cuenta (Jefe/Colega) del usuario autenticado para registrar el retiro de ganancia");
        }

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

        RetiroGananciaAbono retiro = new RetiroGananciaAbono();
        retiro.setMonto(monto);
        retiro.setFecha(fecha);
        retiro.setObservacion(request.getObservacion());
        retiro.setMedioPago(request.getMedioPago());
        retiro.setCuentaAbono(cuenta);
        retiro.setUsuario(getUsuarioAutenticado());
        retiro.setUnidadNegocio(abono);

        // Sobre-retiro permitido a propósito (Decisión 4 de design.md): no se valida el monto
        // contra la ganancia disponible antes de guardar. Pedido explícito del dueño.
        retiroGananciaAbonoRepository.save(retiro);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RetiroGananciaDTO> obtenerHistorialRetirosGanancia(Pageable pageable) {
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new RuntimeException("Unidad de negocio Abono no encontrada"));

        // Deliberadamente NO filtra por CuentaAbonoContextHolder (Decisión 6 de design.md):
        // historial global, mismo criterio que historial-cobros-abono -- quien tiene
        // LEER_FINANZAS ya ve la liquidación completa de ambas cuentas.
        return retiroGananciaAbonoRepository.findAllByUnidadNegocioIdOrderByFechaDescIdDesc(abono.getId(), pageable)
                .map(r -> {
                    RetiroGananciaDTO dto = new RetiroGananciaDTO();
                    dto.setId(r.getId());
                    dto.setMonto(r.getMonto());
                    dto.setFecha(r.getFecha());
                    dto.setObservacion(r.getObservacion());
                    dto.setMedioPago(r.getMedioPago());
                    dto.setCuentaAbono(r.getCuentaAbono());
                    dto.setRetiradoPor(CuentaAbonoNombres.nombreVisible(r.getCuentaAbono()));
                    return dto;
                });
    }

    @Override
    @Transactional(readOnly = true)
    public GananciaDisponibleAbonoDTO obtenerGananciaDisponible() {
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new RuntimeException("Unidad de negocio Abono no encontrada"));

        // Acumulado histórico completo (Decisión 3 de design.md de retiro-ganancia-abono): mismo
        // truco de rango que ya usa obtenerSaldoCajaColega() -- épocas hasta ahora, en vez del
        // desde/hasta que recibe obtenerLiquidacion. Misma fórmula de reparto (calcularReparticion,
        // tarea 4.7), sólo cambia el rango de fechas.
        LocalDateTime epoch = LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime ahora = LocalDateTime.now();

        ReparticionAbono reparticion = calcularReparticion(abono, epoch, ahora);
        BigDecimal gananciaTeoricaColega = reparticion.compensacionColega();
        // El jefe se queda con el resto -- no tiene un % propio configurado, igual que hoy
        // LiquidacionAbonoDTO no expone un campo separado para él.
        BigDecimal gananciaTeoricaJefe = reparticion.ingresosNetos().subtract(gananciaTeoricaColega);

        BigDecimal retirosColega = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono.getId(), CuentaAbono.COLEGA);
        BigDecimal retirosJefe = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono.getId(), CuentaAbono.JEFE);

        GananciaDisponibleAbonoDTO dto = new GananciaDisponibleAbonoDTO();
        dto.setGananciaTeoricaAcumuladaJefe(gananciaTeoricaJefe);
        dto.setGananciaTeoricaAcumuladaColega(gananciaTeoricaColega);
        dto.setRetirosAcumuladosJefe(retirosJefe);
        dto.setRetirosAcumuladosColega(retirosColega);
        // Sobre-retiro permitido a propósito (Decisión 4 de design.md): puede dar negativo, no se
        // recorta a cero ni se lanza error.
        dto.setGananciaDisponibleJefe(gananciaTeoricaJefe.subtract(retirosJefe));
        dto.setGananciaDisponibleColega(gananciaTeoricaColega.subtract(retirosColega));
        return dto;
    }
}
