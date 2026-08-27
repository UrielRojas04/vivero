package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ChequeDTO;
import com.vivero.gestion.models.Cheque;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EstadoCheque;
import com.vivero.gestion.models.enums.EstadoPago;
import com.vivero.gestion.repositories.ChequeRepository;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.ChequeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChequeServiceImpl implements ChequeService {

    @Autowired
    private ChequeRepository chequeRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<ChequeDTO> listarCheques(Pageable pageable) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            return chequeRepository.findAllByUnidadNegocioIdOrderByFechaRecepcionDesc(unidadId, pageable).map(this::toDTO);
        }
        return chequeRepository.findAllByOrderByFechaRecepcionDesc(pageable).map(this::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public ChequeDTO obtenerPorId(Long id) {
        return chequeRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Cheque no encontrado"));
    }

    @Override
    @Transactional
    public ChequeDTO crearCheque(ChequeDTO dto) {
        Cheque cheque = new Cheque();
        cheque.setFechaRecepcion(dto.getFechaRecepcion() != null ? dto.getFechaRecepcion() : LocalDate.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        cheque.setMonto(dto.getMonto());
        cheque.setBanco(dto.getBanco());
        cheque.setFechaCobro(dto.getFechaCobro());
        cheque.setNumeroSerie(dto.getNumeroSerie());
        cheque.setNumeroInterno(dto.getNumeroInterno());
        cheque.setEstado(EstadoCheque.EN_CARTERA);
        cheque.setEsEmisionPropia(dto.getEsEmisionPropia() != null ? dto.getEsEmisionPropia() : false);
        
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            cheque.setUnidadNegocio(unidadNegocioRepository.getReferenceById(unidadId));
        }
        
        if (dto.getClienteId() != null) {
            Cliente cliente = clienteRepository.findById(dto.getClienteId())
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
            cheque.setCliente(cliente);
            if (cliente.getCuentaCorrienteDinero() == null) {
                com.vivero.gestion.models.CuentaCorrienteDinero nuevaCcd = new com.vivero.gestion.models.CuentaCorrienteDinero();
                nuevaCcd.setCliente(cliente);
                nuevaCcd.setBalancePesos(java.math.BigDecimal.ZERO);
                cliente.setCuentaCorrienteDinero(nuevaCcd);
            }
            if (Boolean.TRUE.equals(dto.getEsEmisionPropia())) {
                cliente.getCuentaCorrienteDinero().agregarDeuda(dto.getMonto());
            } else {
                cliente.getCuentaCorrienteDinero().agregarSaldoAFavor(dto.getMonto());
            }
            clienteRepository.save(cliente);
        }
        
        Cheque guardado = chequeRepository.save(cheque);
        return toDTO(guardado);
    }

    @Override
    @Transactional
    public ChequeDTO actualizarEstado(Long id, ChequeDTO dto) {
        Cheque cheque = chequeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cheque no encontrado"));

        EstadoCheque estadoActual = cheque.getEstado();
        EstadoCheque estadoNuevo = dto.getEstado() != null ? EstadoCheque.valueOf(dto.getEstado()) : null;

        // Única excepción al bloqueo de inmutabilidad (Decisión 2 de design.md): el rebote de
        // un cheque ya endosado. Todo lo demás sobre RECHAZADO/ENTREGADO/COBRADO sigue bloqueado.
        boolean esRechazoDeChequeEndosado = estadoActual == EstadoCheque.ENTREGADO && estadoNuevo == EstadoCheque.RECHAZADO;

        if ((estadoActual == EstadoCheque.RECHAZADO || estadoActual == EstadoCheque.ENTREGADO || estadoActual == EstadoCheque.COBRADO)
                && !esRechazoDeChequeEndosado) {
            throw new RuntimeException("Un cheque en estado " + estadoActual + " no puede ser modificado por razones de seguridad contable.");
        }

        if (estadoNuevo != null) {

            if (estadoNuevo == EstadoCheque.RECHAZADO && estadoActual != EstadoCheque.RECHAZADO) {
                // Fail before you touch: resolver las dos contrapartes antes de mover un solo peso.
                Cliente clienteOriginal = cheque.getCliente();
                Cliente endosatario = cheque.getEndosadoACliente();
                if (endosatario == null && esRechazoDeChequeEndosado && dto.getEndosadoAClienteId() != null) {
                    // Open Question 1, opción (c): cheque ENTREGADO preexistente sin endosatario
                    // persistido; el usuario lo selecciona en el modal al momento del rechazo.
                    endosatario = clienteRepository.findById(dto.getEndosadoAClienteId())
                            .orElseThrow(() -> new RuntimeException("Cliente endosatario no encontrado"));
                    cheque.setEndosadoACliente(endosatario);
                }

                // Pata 1 — cliente original: vuelve a deber el monto del cheque. Rama ya existente,
                // reutilizada tal cual (misma ramificación por esEmisionPropia, sin duplicarla).
                if (clienteOriginal != null) {
                    if (clienteOriginal.getCuentaCorrienteDinero() == null) {
                        com.vivero.gestion.models.CuentaCorrienteDinero nuevaCcd = new com.vivero.gestion.models.CuentaCorrienteDinero();
                        nuevaCcd.setCliente(clienteOriginal);
                        nuevaCcd.setBalancePesos(java.math.BigDecimal.ZERO);
                        clienteOriginal.setCuentaCorrienteDinero(nuevaCcd);
                    }
                    if (Boolean.TRUE.equals(cheque.getEsEmisionPropia())) {
                        clienteOriginal.getCuentaCorrienteDinero().agregarSaldoAFavor(cheque.getMonto());
                    } else {
                        clienteOriginal.getCuentaCorrienteDinero().agregarDeuda(cheque.getMonto());
                    }
                    clienteRepository.save(clienteOriginal);
                }

                // Pata 2 — endosatario: se deshace el agregarDeuda que se le hizo al endosarle el
                // cheque; el vivero vuelve a deberle esa plata. Sólo aplica al rebote de un cheque
                // endosado y sólo cuando el endosatario es un cliente del sistema (Decisión 7: el
                // endoso a un tercero de texto libre no mueve ninguna cuenta, y su reversa tampoco).
                if (esRechazoDeChequeEndosado && endosatario != null) {
                    if (endosatario.getCuentaCorrienteDinero() == null) {
                        com.vivero.gestion.models.CuentaCorrienteDinero nuevaCcd = new com.vivero.gestion.models.CuentaCorrienteDinero();
                        nuevaCcd.setCliente(endosatario);
                        nuevaCcd.setBalancePesos(java.math.BigDecimal.ZERO);
                        endosatario.setCuentaCorrienteDinero(nuevaCcd);
                    }
                    endosatario.getCuentaCorrienteDinero().agregarSaldoAFavor(cheque.getMonto());
                    clienteRepository.save(endosatario);
                }
                // Pata 3 — invalida el pago original de la factura/venta si existe
                if (cheque.getPagoOrigen() != null) {
                    com.vivero.gestion.models.Pago pago = cheque.getPagoOrigen();
                    pago.setEstado(EstadoPago.RECHAZADO);
                    pagoRepository.save(pago);
                }
            }

            cheque.setEstado(estadoNuevo);

            if (estadoNuevo == EstadoCheque.ENTREGADO) {
                if (dto.getEndosadoAClienteId() != null) {
                    Cliente cliente = clienteRepository.findById(dto.getEndosadoAClienteId())
                            .orElseThrow(() -> new RuntimeException("Cliente a endosar no encontrado"));
                    if (cliente.getCuentaCorrienteDinero() == null) {
                        com.vivero.gestion.models.CuentaCorrienteDinero nuevaCcd = new com.vivero.gestion.models.CuentaCorrienteDinero();
                        nuevaCcd.setCliente(cliente);
                        nuevaCcd.setBalancePesos(java.math.BigDecimal.ZERO);
                        cliente.setCuentaCorrienteDinero(nuevaCcd);
                    }
                    cliente.getCuentaCorrienteDinero().agregarDeuda(cheque.getMonto());
                    clienteRepository.save(cliente);
                    cheque.setEntregadoA(cliente.getNombreRazonSocial());
                    cheque.setEndosadoACliente(cliente);
                } else {
                    cheque.setEntregadoA(dto.getEntregadoA());
                }
                cheque.setFechaEntrega(dto.getFechaEntrega() != null ? dto.getFechaEntrega() : LocalDate.now(ZoneId.of("America/Argentina/Buenos_Aires")));
            } else if (!esRechazoDeChequeEndosado) {
                // Decisión 4: el rebote de un cheque endosado preserva entregadoA, fechaEntrega y
                // endosadoACliente. La rama de limpieza sigue aplicando para el resto de los casos
                // (en la práctica, sólo transiciones desde EN_CARTERA, donde ya están vacíos).
                cheque.setFechaEntrega(null);
                cheque.setEntregadoA(null);
            }
        }

        return toDTO(chequeRepository.save(cheque));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChequeDTO> listarChequesPorCliente(Long clienteId) {
        return chequeRepository.findByClienteIdOrderByFechaRecepcionDesc(clienteId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private ChequeDTO toDTO(Cheque cheque) {
        ChequeDTO dto = new ChequeDTO();
        dto.setId(cheque.getId());
        dto.setFechaRecepcion(cheque.getFechaRecepcion());
        try {
            if (cheque.getCliente() != null) {
                dto.setClienteId(cheque.getCliente().getId());
                dto.setClienteNombre(cheque.getCliente().getNombreRazonSocial());
            } else if (cheque.getVenta() != null && cheque.getVenta().getClienteNombreCasual() != null) {
                dto.setClienteNombre(cheque.getVenta().getClienteNombreCasual() + " (Casual)");
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            dto.setClienteNombre("(eliminado)");
        }
        try {
            if (cheque.getVenta() != null) {
                dto.setVentaId(cheque.getVenta().getId());
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            // Venta was soft-deleted, skip
        }
        try {
            if (cheque.getEndosadoACliente() != null) {
                dto.setEndosadoAClienteId(cheque.getEndosadoACliente().getId());
                dto.setEndosadoAClienteNombre(cheque.getEndosadoACliente().getNombreRazonSocial());
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            dto.setEndosadoAClienteNombre("(eliminado)");
        }
        dto.setNumeroInterno(cheque.getNumeroInterno());
        dto.setMonto(cheque.getMonto());
        dto.setBanco(cheque.getBanco());
        dto.setFechaCobro(cheque.getFechaCobro());
        dto.setNumeroSerie(cheque.getNumeroSerie());
        dto.setEstado(cheque.getEstado().name());
        dto.setFechaEntrega(cheque.getFechaEntrega());
        dto.setEntregadoA(cheque.getEntregadoA());
        dto.setEsEmisionPropia(cheque.getEsEmisionPropia());
        return dto;
    }
}
