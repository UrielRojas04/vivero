package com.vivero.gestion.services.impl;

import java.math.BigDecimal;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.DevolucionProductoDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaCorrienteBandejas;
import com.vivero.gestion.models.CuentaCorrienteDinero;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.services.DevolucionService;
import com.vivero.gestion.services.MovimientoStockService;

import lombok.RequiredArgsConstructor;

// Movido acá desde DevolucionController (regla dura #6: Controller nunca llama Repository
// directo) -- lógica sin cambios respecto al controller original, sólo reubicada.
@Service
@RequiredArgsConstructor
public class DevolucionServiceImpl implements DevolucionService {

    private final ClienteRepository clienteRepository;
    private final ProductoRepository productoRepository;
    private final CuentaCorrienteDineroRepository ccdRepository;
    private final MovimientoStockService movimientoStockService;
    private final UsuarioRepository usuarioRepository;

    @Override
    @Transactional
    public void registrarDevolucionLlenas(DevolucionProductoDTO dto) {
        Cliente cliente = clienteRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        Producto producto = productoRepository.findById(dto.getProductoId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

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

        // Descontar las bandejas devueltas del saldo del cliente
        CuentaCorrienteBandejas ccb = cliente.getCuentaCorrienteBandejas();
        if (ccb == null) {
            ccb = new CuentaCorrienteBandejas();
            ccb.setCliente(cliente);
            ccb.setBalanceBandejas(0);
            cliente.setCuentaCorrienteBandejas(ccb);
        }
        ccb.setBalanceBandejas(ccb.getBalanceBandejas() - dto.getCantidad());
        clienteRepository.save(cliente);

        // Acreditar en Cuenta Corriente (si monto > 0)
        if (dto.getMontoAcreditar() != null && dto.getMontoAcreditar().compareTo(BigDecimal.ZERO) > 0) {
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
}
