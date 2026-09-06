package com.vivero.gestion.security;

import com.vivero.gestion.models.CuentaAbono;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class CuentaAbonoFilter extends OncePerRequestFilter {

    private static final String USERNAME_COLEGA = "Pablo";
    private static final String USERNAME_JEFE = "Sergio";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String username = auth.getName();
            if (USERNAME_COLEGA.equals(username)) {
                CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.COLEGA);
            } else if (USERNAME_JEFE.equals(username)) {
                CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);
            }
            // Cualquier otro usuario autenticado (un tercer empleado futuro, por ejemplo) NO cae
            // en JEFE por defecto: el contexto queda vacío. Atribuirle silenciosamente sus
            // operaciones de Abono al jefe sería peor que dejarlas sin atribución de cuenta
            // (mismo criterio que Decisión 5 de design.md: "nunca cae en un default silencioso").
            // Los servicios de Abono que necesitan una cuenta definida (ej. RendicionColegaService)
            // deben validar explícitamente que el contexto no esté vacío y rechazar con un error
            // claro, en vez de asumir JEFE.
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // ALWAYS clear the ThreadLocal after the request to prevent leaking state
            // to other threads in the Tomcat thread pool
            CuentaAbonoContextHolder.clear();
        }
    }
}
