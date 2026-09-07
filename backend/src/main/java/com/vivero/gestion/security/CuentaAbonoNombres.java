package com.vivero.gestion.security;

import com.vivero.gestion.models.CuentaAbono;

import java.util.Optional;

/**
 * Dueña única del mapeo "cuenta operativa de Abono <-> persona real": JEFE <-> Sergio,
 * COLEGA <-> Pablo. Antes vivía duplicado (hardcodeado) dentro de CuentaAbonoFilter; se
 * centraliza acá para que un futuro renombre de usuario toque un solo archivo (Decisión 1
 * de design.md de historial-cobros-abono).
 */
public final class CuentaAbonoNombres {

    private static final String NOMBRE_JEFE = "Sergio";
    private static final String NOMBRE_COLEGA = "Pablo";
    private static final String SIN_CUENTA_ASIGNADA = "Sin cuenta asignada";

    private CuentaAbonoNombres() {
    }

    public static String nombreVisible(CuentaAbono cuenta) {
        if (cuenta == CuentaAbono.JEFE) {
            return NOMBRE_JEFE;
        }
        if (cuenta == CuentaAbono.COLEGA) {
            return NOMBRE_COLEGA;
        }
        return SIN_CUENTA_ASIGNADA;
    }

    public static Optional<CuentaAbono> cuentaDe(String username) {
        if (NOMBRE_JEFE.equals(username)) {
            return Optional.of(CuentaAbono.JEFE);
        }
        if (NOMBRE_COLEGA.equals(username)) {
            return Optional.of(CuentaAbono.COLEGA);
        }
        // Cualquier otro username (o null) NO cae en JEFE por defecto: el llamador debe
        // manejar el Optional.empty() explícitamente (mismo criterio ya usado en
        // CuentaAbonoFilter antes de este refactor).
        return Optional.empty();
    }
}
