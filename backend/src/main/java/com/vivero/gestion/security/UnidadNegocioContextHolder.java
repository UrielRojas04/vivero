package com.vivero.gestion.security;

public class UnidadNegocioContextHolder {
    private static final ThreadLocal<Long> CONTEXT = new ThreadLocal<>();

    public static void setUnidadNegocioId(Long id) {
        CONTEXT.set(id);
    }

    public static Long getUnidadNegocioId() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
