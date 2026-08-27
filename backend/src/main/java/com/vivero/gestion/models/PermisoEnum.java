package com.vivero.gestion.models;

import java.util.Arrays;

/**
 * Enum que define todos los permisos del sistema.
 * Los IDs son estables y NO deben reordenarse: agregar nuevos siempre al final.
 * El frontend recibe estos IDs vía PermisoDTO — cambiar un ID rompe la UI.
 */
public enum PermisoEnum {
    LEER_STOCK(1L),
    ESCRIBIR_STOCK(2L),
    ESCRIBIR_VENTAS(3L),
    ADMIN_DB(4L),
    LEER_CLIENTES(5L),
    ESCRIBIR_CLIENTES(6L),
    LEER_INSUMOS(7L),
    ESCRIBIR_INSUMOS(8L),
    LEER_FINANZAS(9L),
    LEER_BANDEJAS(10L),
    ESCRIBIR_BANDEJAS(11L),
    LEER_PEDIDOS(12L),
    ESCRIBIR_PEDIDOS(13L),
    LEER_SIEMBRAS(14L),
    ESCRIBIR_SIEMBRAS(15L),
    ADMIN_SIEMBRAS(16L),
    LEER_FACTURACION(17L);

    private final Long id;

    PermisoEnum(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return this.name();
    }

    /**
     * Busca un PermisoEnum por su ID estable.
     * @throws IllegalArgumentException si no existe un permiso con ese ID.
     */
    public static PermisoEnum fromId(Long id) {
        return Arrays.stream(values())
                .filter(p -> p.id.equals(id))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Permiso con ID " + id + " no encontrado"));
    }
}
