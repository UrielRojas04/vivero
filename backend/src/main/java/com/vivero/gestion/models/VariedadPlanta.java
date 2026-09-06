package com.vivero.gestion.models;

import java.math.BigDecimal;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "variedades_plantas")
@Data
public class VariedadPlanta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;
    private String descripcion;

    // Opcional (pedido del dueño 2026-09-05): habilita convertir RegistroSemilla en GRAMOS a un
    // conteo de semillas (totalSemillas = gramos × semillasPorGramo), igual que SOBRES ya
    // convierte con contenidoPorSobre. Varía muchísimo por especie (una semilla de apio pesa una
    // fracción de lo que pesa una de cebolla) -- no hay forma de derivarlo automáticamente, se
    // carga una vez por variedad. Sin este dato, GRAMOS sigue sin conversión, igual que hoy.
    private BigDecimal semillasPorGramo;

    // Días de crecimiento por mes
    private Integer diasEnero;
    private Integer diasFebrero;
    private Integer diasMarzo;
    private Integer diasAbril;
    private Integer diasMayo;
    private Integer diasJunio;
    private Integer diasJulio;
    private Integer diasAgosto;
    private Integer diasSeptiembre;
    private Integer diasOctubre;
    private Integer diasNoviembre;
    private Integer diasDiciembre;
}
