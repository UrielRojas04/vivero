package com.vivero.gestion.dto;

public class MarcaDTO {
    
    private Long id;
    private String nombre;
    private boolean enUso;

    public MarcaDTO() {}

    public MarcaDTO(Long id, String nombre) {
        this.id = id;
        this.nombre = nombre;
        this.enUso = false;
    }

    public MarcaDTO(Long id, String nombre, boolean enUso) {
        this.id = id;
        this.nombre = nombre;
        this.enUso = enUso;
    }
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public boolean isEnUso() {
        return enUso;
    }

    public void setEnUso(boolean enUso) {
        this.enUso = enUso;
    }
}
