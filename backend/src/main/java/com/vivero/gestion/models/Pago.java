package com.vivero.gestion.models;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.vivero.gestion.models.enums.EstadoPago;

@Entity
@Table(name = "pagos")
@Data
public class Pago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "venta_id")
    private Venta venta; // Puede ser null si es un pago a la factura directo

    @ManyToOne
    @JoinColumn(name = "factura_id")
    private FacturaCliente factura;

    private BigDecimal monto;
    
    private String metodoPago; // EFECTIVO, CHEQUE, TRANSFERENCIA
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(20) default 'ACREDITADO'")
    private EstadoPago estado = EstadoPago.ACREDITADO;
    
    private LocalDateTime fecha;
}
