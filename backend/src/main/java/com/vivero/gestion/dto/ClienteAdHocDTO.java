package com.vivero.gestion.dto;

public class ClienteAdHocDTO {
    private String nombre;
    private String telefono;
    private boolean casual;

    public ClienteAdHocDTO() {}

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public boolean isCasual() {
        return casual;
    }

    public void setCasual(boolean casual) {
        this.casual = casual;
    }
}
