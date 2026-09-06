package com.vivero.gestion.dto;

public class ClienteAdHocDTO {
    private String nombre;
    private String telefono;
    private boolean casual;
    // Documento puntual opcional de esta venta (Decisión 2 de design.md de clientes-dni-cuil).
    // String crudo (no enum) a propósito: un valor fuera de DNI/CUIL debe poder llegar hasta el
    // service para que sea éste quien lo rechace con un mensaje de negocio (ver
    // VentaServiceImpl.parseTipoDocumento), en vez de fallar antes en la deserialización.
    private String documentoTipo;
    private String documentoValor;

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

    public String getDocumentoTipo() {
        return documentoTipo;
    }

    public void setDocumentoTipo(String documentoTipo) {
        this.documentoTipo = documentoTipo;
    }

    public String getDocumentoValor() {
        return documentoValor;
    }

    public void setDocumentoValor(String documentoValor) {
        this.documentoValor = documentoValor;
    }
}
