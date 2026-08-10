package com.vivero.gestion.models;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pagos")
@Data
public class Pago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "venta_id")
    private Venta venta;

    private BigDecimal monto;
    
    private String metodoPago; // EFECTIVO, CHEQUE, TRANSFERENCIA
    
    private LocalDateTime fecha;
}
