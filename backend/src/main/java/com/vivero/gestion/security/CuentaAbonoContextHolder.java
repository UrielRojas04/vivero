package com.vivero.gestion.security;

import com.vivero.gestion.models.CuentaAbono;

public class CuentaAbonoContextHolder {
    private static final ThreadLocal<CuentaAbono> CONTEXT = new ThreadLocal<>();

    public static void setCuentaAbono(CuentaAbono cuenta) {
        CONTEXT.set(cuenta);
    }

    public static CuentaAbono getCuentaAbono() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
