package com.vivero.gestion.models;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "siembras")
@Data
public class Siembra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "variedad_planta_id")
    private VariedadPlanta variedadPlanta;

    @ManyToOne
    @JoinColumn(name = "variedad_bandeja_id")
    private VariedadBandeja variedadBandeja;

    private LocalDate fechaEstimada;

    private String dueno;

    // Código de lote impreso por el proveedor en el sobre de semillas.
    // NO lleva restricción de unicidad: varias siembras pueden compartir el
    // mismo código de lote cuando de un sobre salen siembras para clientes distintos.
    private String codigoLote;

    // Número de siembra interno asignado por el vivero. Obligatorio en todos los
    // orígenes; la obligatoriedad se valida en el servicio, no aquí.
    private String numeroSiembra;

    @Enumerated(EnumType.STRING)
    private TipoOrigenSiembra tipoOrigen;

    private Integer cantidad;

    @Enumerated(EnumType.STRING)
    private EstadoSiembra estado = EstadoSiembra.EN_PROCESO;
}
