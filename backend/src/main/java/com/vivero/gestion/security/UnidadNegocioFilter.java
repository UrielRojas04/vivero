package com.vivero.gestion.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class UnidadNegocioFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String header = request.getHeader("X-Unidad-Negocio");
        if (header != null && !header.isEmpty()) {
            try {
                Long unidadId = Long.parseLong(header);
                UnidadNegocioContextHolder.setUnidadNegocioId(unidadId);
            } catch (NumberFormatException e) {
                // Ignore invalid format, Context remains null
            }
        }
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            UnidadNegocioContextHolder.clear();
        }
    }
}
