package com.vivero.gestion.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "variedades")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Variedad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre no puede estar vacío")
    @Column(unique = true, nullable = false)
    private String nombre; // Ejemplo: Lechuga Mantecosa, Brócoli, etc.

    @Column(name = "dias_invernadero_sugeridos")
    private Integer diasInvernaderoSugeridos = 20; // Lo que me comentaste del ciclo de 20 días

    @Column(name = "dias_telas_sugeridos")
    private Integer diasTelasSugeridos = 7;

    // Por si querés agregar una descripción o categoría (ej: "Hoja verde")
    private String descripcion;
}