package com.vivero.gestion.dto;

import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.enums.EstadoPago;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fila del historial global de cobros de Abono (Decisión 2 de design.md de
 * historial-cobros-abono). Dedicado -- NO extiende ni reemplaza PagoResponseDTO (ese sigue
 * embebido en VentaResponseDTO.pagos, sin tocar).
 *
 * Los primeros 10 campos vienen de la proyección JPQL de PagoRepository.listarHistorialCobros
 * (constructor de abajo). `cobradoPor` y `origen` NO viajan en esa proyección: se derivan en
 * HistorialCobrosAbonoServiceImpl (cobradoPor vía CuentaAbonoNombres.nombreVisible(...), origen
 * según haya o no ventaId) y se completan después con sus setters.
 */
public class PagoHistorialAbonoDTO {

    private Long id;
    private LocalDateTime fecha;
    private BigDecimal monto;
    private String metodoPago;
    private EstadoPago estado;
    private CuentaAbono cuentaAbono;
    private Long ventaId;
    private LocalDateTime fechaVenta;
    private Long facturaId;
    private String clienteNombre;

    // Derivados en el servicio, no en la query.
    private String cobradoPor;
    private String origen;

    public PagoHistorialAbonoDTO() {
    }

    public PagoHistorialAbonoDTO(Long id, LocalDateTime fecha, BigDecimal monto, String metodoPago,
                                  EstadoPago estado, CuentaAbono cuentaAbono, Long ventaId,
                                  LocalDateTime fechaVenta, Long facturaId, String clienteNombre) {
        this.id = id;
        this.fecha = fecha;
        this.monto = monto;
        this.metodoPago = metodoPago;
        this.estado = estado;
        this.cuentaAbono = cuentaAbono;
        this.ventaId = ventaId;
        this.fechaVenta = fechaVenta;
        this.facturaId = facturaId;
        this.clienteNombre = clienteNombre;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public EstadoPago getEstado() { return estado; }
    public void setEstado(EstadoPago estado) { this.estado = estado; }

    public CuentaAbono getCuentaAbono() { return cuentaAbono; }
    public void setCuentaAbono(CuentaAbono cuentaAbono) { this.cuentaAbono = cuentaAbono; }

    public Long getVentaId() { return ventaId; }
    public void setVentaId(Long ventaId) { this.ventaId = ventaId; }

    public LocalDateTime getFechaVenta() { return fechaVenta; }
    public void setFechaVenta(LocalDateTime fechaVenta) { this.fechaVenta = fechaVenta; }

    public Long getFacturaId() { return facturaId; }
    public void setFacturaId(Long facturaId) { this.facturaId = facturaId; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getCobradoPor() { return cobradoPor; }
    public void setCobradoPor(String cobradoPor) { this.cobradoPor = cobradoPor; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }
}
