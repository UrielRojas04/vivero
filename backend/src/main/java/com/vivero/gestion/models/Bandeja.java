package com.vivero.gestion.models;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Table(name = "bandejas")
@Data
public class Bandeja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "variedad_id", nullable = false)
    private Variedad variedad;

    @ManyToOne
    @JoinColumn(name = "tipo_id")
    private TipoBandeja tipoBandeja;

    @ManyToOne
    @JoinColumn(name = "ubicacion_id")
    private Ubicacion ubicacion;

    private Integer cantidad;
    private String duenio;
    private String codigoLote; // Para agrupar las partes de una misma siembra original

    private String usuarioCreador;     // Quién registró
    private String usuarioAsignador;   // Quién puso en invernadero
    private String usuarioTrasladador; // Quién movió a telas

    private LocalDate fechaSiembra;
    private LocalDate fechaEstimadaSalida;

    private LocalDate fechaIngresoTelas;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    private Boolean enTelas = false;
    private Boolean vendida = false;

    @PrePersist
    public void alCrear() {
        if (this.fechaSiembra == null) {
            this.fechaSiembra = LocalDate.now();
        }

        // Generamos un código de lote único si no lo trae (es una siembra nueva)
        if (this.codigoLote == null) {
            this.codigoLote = "L-" + java.util.UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        }

        if (variedad != null && variedad.getDiasInvernaderoSugeridos() != null) {
            this.fechaEstimadaSalida = this.fechaSiembra.plusDays(variedad.getDiasInvernaderoSugeridos());
        }
    }
}