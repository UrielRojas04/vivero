package com.vivero.gestion.security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Hallazgo de auditoría de seguridad (2026-09-09, antes de subir a GitHub/VPS): /api/auth/login
 * no tenía ningún límite de intentos -- una vez alcanzable desde internet, quedaba abierto a
 * fuerza bruta de contraseña sin restricción. Bloqueo simple en memoria por username (no por IP,
 * para no bloquear a toda una oficina detrás del mismo router si alguien se equivoca de
 * contraseña varias veces): tras MAX_INTENTOS fallos dentro de la ventana, ese username queda
 * bloqueado hasta que la ventana expire. Un único proceso backend (no hay múltiples instancias
 * detrás de un load balancer en este despliegue), así que un mapa en memoria alcanza -- no hace
 * falta Redis ni ninguna librería nueva para esta escala.
 */
@Component
public class LoginAttemptService {

    private static final int MAX_INTENTOS = 5;
    private static final long VENTANA_MS = 15 * 60 * 1000L; // 15 minutos

    private final Map<String, Intentos> intentosPorUsuario = new ConcurrentHashMap<>();

    private static class Intentos {
        int cantidad;
        long primerIntentoEpochMs;
    }

    public void registrarFallo(String username) {
        if (username == null) return;
        String key = username.trim().toLowerCase();
        long ahora = System.currentTimeMillis();
        intentosPorUsuario.compute(key, (k, existente) -> {
            if (existente == null || ahora - existente.primerIntentoEpochMs > VENTANA_MS) {
                Intentos nuevo = new Intentos();
                nuevo.cantidad = 1;
                nuevo.primerIntentoEpochMs = ahora;
                return nuevo;
            }
            existente.cantidad++;
            return existente;
        });
    }

    public void registrarExito(String username) {
        if (username == null) return;
        intentosPorUsuario.remove(username.trim().toLowerCase());
    }

    public boolean estaBloqueado(String username) {
        if (username == null) return false;
        Intentos i = intentosPorUsuario.get(username.trim().toLowerCase());
        if (i == null) return false;
        if (System.currentTimeMillis() - i.primerIntentoEpochMs > VENTANA_MS) return false;
        return i.cantidad >= MAX_INTENTOS;
    }
}
