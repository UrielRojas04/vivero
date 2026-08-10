package com.vivero.gestion.security;

import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("securityService")
public class SecurityService {

    private final UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    public SecurityService(UnidadNegocioRepository unidadNegocioRepository) {
        this.unidadNegocioRepository = unidadNegocioRepository;
    }

    @Transactional(readOnly = true)
    public boolean hasUnidadPermission(Long unidadNegocioId, String permiso) {
        if (unidadNegocioId == null) {
            return false;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        UnidadNegocio unidad = unidadNegocioRepository.findById(unidadNegocioId).orElse(null);
        if (unidad == null) {
            return false;
        }

        String autoridadRequerida = unidad.getNombre().toUpperCase().replace(" ", "_") + "_" + permiso;

        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(autoridadRequerida));
    }
    
    @Autowired
    private com.vivero.gestion.repositories.InsumoRepository insumoRepository;
    
    @Transactional(readOnly = true)
    public boolean hasInsumoPermission(Long insumoId, String permiso) {
        if (insumoId == null) {
            return false;
        }
        com.vivero.gestion.models.Insumo insumo = insumoRepository.findById(insumoId).orElse(null);
        if (insumo == null) {
            return false;
        }
        return hasUnidadPermission(insumo.getUnidadNegocio().getId(), permiso);
    }
}
