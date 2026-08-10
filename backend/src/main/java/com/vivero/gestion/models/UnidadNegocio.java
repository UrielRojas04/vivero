package com.vivero.gestion.models;

import jakarta.persistence.*;

@Entity
@Table(name = "unidades_negocio")
public class UnidadNegocio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String nombre;

    public UnidadNegocio() {}

    public UnidadNegocio(String nombre) {
        this.nombre = nombre;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
}
