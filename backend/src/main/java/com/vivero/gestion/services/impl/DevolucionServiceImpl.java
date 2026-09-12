package com.vivero.gestion.services.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.DevolucionProductoDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaCorrienteBandejas;
import com.vivero.gestion.models.CuentaCorrienteDinero;
import com.vivero.gestion.models.FacturaCliente;
import com.vivero.gestion.models.HistorialBandejas;
import com.vivero.gestion.models.Pago;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import com.vivero.gestion.repositories.FacturaClienteRepository;
import com.vivero.gestion.repositories.HistorialBandejasRepository;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.DevolucionService;
import com.vivero.gestion.services.MovimientoStockService;

import lombok.RequiredArgsConstructor;

// Change trazabilidad-devolucion-producto: además de mover los saldos (balancePesos,
// balanceBandejas -- matemática SIN CAMBIOS, ver design.md Decisión 7), esta clase ahora deja
// rastro itemizado de la devolución: un Pago (metodoPago="DEVOLUCION") ligado a la factura
// ABIERTA del cliente, y un movimiento tipo="DEVOLUCION" en historial_bandejas. Antes de este
// change sólo mutaba los saldos acumulados, sin ningún registro trazable (bug reportado por el
// dueño: la devolución no se veía en la pantalla de Facturación ni en el historial de bandejas).
@Service
@RequiredArgsConstructor
public class DevolucionServiceImpl implements DevolucionService {

    // Vocabulario compartido a propósito entre el metodoPago del Pago y el tipo del
    // HistorialBandejas: son los dos rastros de la misma operación (Decisión 2 de design.md).
    private static final String TIPO_DEVOLUCION = "DEVOLUCION";

    private final ClienteRepository clienteRepository;
    private final ProductoRepository productoRepository;
    private final CuentaCorrienteDineroRepository ccdRepository;
    private final MovimientoStockService movimientoStockService;
    private final UsuarioRepository usuarioRepository;
    private final FacturaClienteRepository facturaClienteRepository;
    private final PagoRepository pagoRepository;
    private final HistorialBandejasRepository historialBandejasRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;

    @Override
    @Transactional
    public void registrarDevolucionLlenas(DevolucionProductoDTO dto) {
        // Decisión 4 de design.md: sin unidad de negocio activa no hay forma de elegir/crear la
        // factura correcta para el Pago -- se rechaza ANTES de tocar producto, stock o saldo,
        // en vez de acreditar en silencio sin poder dejar el rastro (que es el bug original).
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId == null) {
            throw new IllegalArgumentException(
                    "La devolución de producto requiere una unidad de negocio activa");
        }

        Cliente cliente = clienteRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        Producto producto = productoRepository.findById(dto.getProductoId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        // Resuelto y validado ANTES de tocar producto/stock (hallazgo real en producción: sin
        // este guard, un cliente terminó con balanceBandejas en -6 porque nada impedía devolver
        // más de lo que debía). Mismo criterio que BandejasServiceImpl.registrarDevolucion.
        CuentaCorrienteBandejas ccb = cliente.getCuentaCorrienteBandejas();
        if (ccb == null) {
            ccb = new CuentaCorrienteBandejas();
            ccb.setCliente(cliente);
            ccb.setBalanceBandejas(0);
            cliente.setCuentaCorrienteBandejas(ccb);
        }
        if (dto.getCantidad() != null && dto.getCantidad() > ccb.getBalanceBandejas()) {
            throw new IllegalArgumentException(
                    "No se puede devolver más bandejas de las que el cliente debe (debe "
                            + ccb.getBalanceBandejas() + ", se intentó devolver " + dto.getCantidad() + ")");
        }

        // Crear un nuevo producto para la devolución (para no afectar el stock original de Juan)
        Producto devolucion = new Producto();
        org.springframework.beans.BeanUtils.copyProperties(producto, devolucion, "id", "stock", "esDevolucion", "dueno", "duenoAnterior", "nombre", "descuentos");

        String duenoAnterior = producto.getDueno() != null ? producto.getDueno() : cliente.getNombreRazonSocial();
        devolucion.setStock(dto.getCantidad());
        devolucion.setDuenoAnterior(duenoAnterior);
        devolucion.setEsDevolucion(true);
        devolucion.setDueno("JEFE");

        String nombreBase = producto.getNombre() != null ? producto.getNombre() : "";
        if (!nombreBase.toUpperCase().endsWith(" DEVUELTO")) {
            nombreBase = nombreBase + " DEVUELTO";
        }
        devolucion.setNombre(nombreBase);

        productoRepository.save(devolucion);

        // Registrar devolución en Stock usando el NUEVO producto
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Usuario admin = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        movimientoStockService.registrarMovimiento(
                devolucion,
                dto.getCantidad(),
                TipoMovimientoStock.DEVOLUCION_SOBRANTE,
                admin
        );

        // Descontar las bandejas devueltas del saldo del cliente (ccb ya resuelto y validado arriba)
        ccb.setBalanceBandejas(ccb.getBalanceBandejas() - dto.getCantidad());
        clienteRepository.save(cliente);

        // Rastro de la bandeja repuesta (Decisión 6 y 8 de design.md): mismo patrón que
        // BandejasServiceImpl.registrarDevolucion -- se AGREGA al descuento de arriba, no lo
        // reemplaza ni cambia su camino de escritura. Guardado sólo si hay cantidad real, para no
        // ensuciar el historial con un movimiento de 0.
        if (dto.getCantidad() != null && dto.getCantidad() > 0) {
            HistorialBandejas historial = new HistorialBandejas();
            historial.setCliente(cliente);
            historial.setCantidad(dto.getCantidad());
            historial.setTipo(TIPO_DEVOLUCION);
            historial.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
            historial.setUsuario(admin);
            historialBandejasRepository.save(historial);
        }

        // Acreditar en Cuenta Corriente (si monto > 0)
        if (dto.getMontoAcreditar() != null && dto.getMontoAcreditar().compareTo(BigDecimal.ZERO) > 0) {
            // Rastro trazable del crédito (Decisión 1/3 de design.md): se resuelve o abre la
            // factura ABIERTA del cliente -- mismo criterio literal que VentaServiceImpl -- y se
            // crea el Pago ANTES de tocar el saldo acumulado de abajo, para que ambas escrituras
            // queden en la misma transacción sin alterar el signo ni la cantidad de veces que se
            // acredita.
            FacturaCliente factura = resolverFacturaAbierta(cliente, unidadId);

            Pago pago = new Pago();
            pago.setMonto(dto.getMontoAcreditar());
            pago.setMetodoPago(TIPO_DEVOLUCION);
            pago.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
            pago.setFactura(factura);
            // cuentaAbono queda sin setear a propósito (Decisión 5 de design.md): una devolución
            // no es plata que entró a la caja de nadie, y no debe computar como ingreso en la
            // rendición del colega/jefe (PagoRepository.sumarPagosPorCuentaYPeriodo filtra por
            // cuentaAbono).
            pagoRepository.save(pago);

            CuentaCorrienteDinero ccd = ccdRepository.findByClienteId(cliente.getId())
                    .orElseGet(() -> {
                        CuentaCorrienteDinero nueva = new CuentaCorrienteDinero();
                        nueva.setCliente(cliente);
                        nueva.setBalancePesos(BigDecimal.ZERO);
                        return ccdRepository.save(nueva);
                    });

            ccd.agregarSaldoAFavor(dto.getMontoAcreditar());
            ccdRepository.save(ccd);
        }
    }

    // Copiado literal del criterio de VentaServiceImpl (líneas ~204-214, transcripto en tasks.md
    // 2.5): resuelve la factura ABIERTA del cliente en la unidad activa, o abre una nueva con el
    // mismo estado inicial si no existe. Sin esto, una devolución con el ciclo de facturación ya
    // cerrado fallaría por un motivo puramente administrativo (Decisión 3 de design.md).
    private FacturaCliente resolverFacturaAbierta(Cliente cliente, Long unidadId) {
        return facturaClienteRepository
                .findByClienteIdAndEstadoAndUnidadNegocioId(cliente.getId(), "ABIERTA", unidadId)
                .orElseGet(() -> {
                    UnidadNegocio unidad = unidadNegocioRepository.findById(unidadId)
                            .orElseThrow(() -> new RuntimeException("Unidad de negocio no encontrada"));
                    FacturaCliente nueva = new FacturaCliente();
                    nueva.setCliente(cliente);
                    nueva.setUnidadNegocio(unidad);
                    nueva.setEstado("ABIERTA");
                    nueva.setFechaApertura(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
                    return facturaClienteRepository.save(nueva);
                });
    }
}
