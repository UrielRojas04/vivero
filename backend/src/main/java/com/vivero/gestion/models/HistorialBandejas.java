package com.vivero.gestion.models;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "historial_bandejas")
@Data
public class HistorialBandejas {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @ManyToOne
    @JoinColumn(name = "venta_id")
    private Venta venta; // Puede ser nulo si es una devolución suelta

    @Column(nullable = false)
    private Integer cantidad;

    @Column(nullable = false, length = 20)
    private String tipo; // "ENTREGA" o "DEVOLUCION"

    @Column(nullable = false)
    private LocalDateTime fecha;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
}
