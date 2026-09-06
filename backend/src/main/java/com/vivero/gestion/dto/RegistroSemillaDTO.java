package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.vivero.gestion.models.EstadoRegistroSemilla;
import com.vivero.gestion.models.UnidadCantidadSemilla;
import com.vivero.gestion.models.UnidadContenidoSobre;

import lombok.Data;

/**
 * Nunca se expone la entidad JPA RegistroSemilla directamente (regla dura 5). totalSemillas
 * es derivado en el servicio (cantidad × contenidoPorSobre cuando unidadCantidad == SOBRES)
 * y jamás se persiste (Decisión 4 / tarea 2.6).
 */
@Data
public class RegistroSemillaDTO {
    private Long id;
    private LocalDate fechaRecepcion;
    private String lote;
    private Long clienteId;
    private String nombreQuienTrajo;
    private String telefonoContacto;
    private String descripcionSemilla;
    private Long variedadPlantaId;
    private BigDecimal cantidad;
    private UnidadCantidadSemilla unidadCantidad;
    private Integer contenidoPorSobre;
    private UnidadContenidoSobre contenidoPorSobreUnidad;
    private Long variedadBandejaId;
    private String variedadBandejaNombre;
    private Integer cantidadBandejas;
    private String observaciones;
    private Long usuarioRecibeId;
    private String usuarioRecibeNombre;
    private LocalDateTime fechaRegistro;
    private BigDecimal totalSemillas;
    private LocalDate fechaEntrega;
    private LocalDate fechaSiembraProgramada;
    private EstadoRegistroSemilla estado;
}
