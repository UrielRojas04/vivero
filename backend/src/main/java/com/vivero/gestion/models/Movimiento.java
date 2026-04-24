package com.vivero.gestion.models;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimientos")
@Data
public class Movimiento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String codigoLote;   // Para rastrear el historial aunque el lote se divida
    private String origen;       // Ej: "Semillero", "Invernadero A"
    private String destino;      // Ej: "Invernadero B", "Vendido"
    private Integer cantidad;    // Cuántas bandejas se movieron en ese acto
    private String usuario;      // Quién lo hizo
    private LocalDateTime fecha;
    private String tipo;         // "REGISTRO", "UBICACION", "TRASLADO", "VENTA"
    private String variedadNombre; // Ej: "Lechuga Francesa"

    @PrePersist
    public void prePersist() {
        this.fecha = LocalDateTime.now();
    }
}