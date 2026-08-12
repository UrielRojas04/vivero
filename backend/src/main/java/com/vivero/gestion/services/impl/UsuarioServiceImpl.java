package com.vivero.gestion.services.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vivero.gestion.dto.UsuarioRequestDTO;
import com.vivero.gestion.dto.UsuarioResponseDTO;
import com.vivero.gestion.models.Rol;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.RolRepository;

import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.services.UsuarioService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UsuarioServiceImpl implements UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;

    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> getAll() {
        Long unidadId = com.vivero.gestion.security.UnidadNegocioContextHolder.getUnidadNegocioId();
        return usuarioRepository.findAll().stream()
                .filter(u -> unidadId == null || "jefe@vivero.com".equalsIgnoreCase(u.getUsername()) || u.getUnidadesNegocio().stream().anyMatch(un -> un.getId().equals(unidadId)))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioResponseDTO getById(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id " + id));
        return mapToDTO(usuario);
    }

    @Override
    @Transactional
    public UsuarioResponseDTO create(UsuarioRequestDTO dto) {
        if (usuarioRepository.findByUsername(dto.getUsername()).isPresent()) {
            throw new RuntimeException("El username ya existe");
        }

        Usuario usuario = new Usuario();
        usuario.setUsername(dto.getUsername());
        
        if (dto.getPassword() == null || dto.getPassword().isEmpty()) {
            throw new RuntimeException("El password es requerido para nuevos usuarios");
        }
        
        usuario.setPassword(passwordEncoder.encode(dto.getPassword()));
        
        updateRoles(usuario, dto.getRoleIds());
        
        usuario.setUnidadesNegocio(new java.util.HashSet<>());
        Long unidadId = com.vivero.gestion.security.UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            com.vivero.gestion.models.UnidadNegocio un = new com.vivero.gestion.models.UnidadNegocio();
            un.setId(unidadId);
            usuario.getUnidadesNegocio().add(un);
        }
        
        Usuario saved = usuarioRepository.save(usuario);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public UsuarioResponseDTO update(Long id, UsuarioRequestDTO dto) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id " + id));

        // Check unique username if changed
        if (!usuario.getUsername().equals(dto.getUsername()) &&
            usuarioRepository.findByUsername(dto.getUsername()).isPresent()) {
            throw new RuntimeException("El username ya existe");
        }

        usuario.setUsername(dto.getUsername());

        // Update password only if provided
        if (dto.getPassword() != null && !dto.getPassword().isEmpty()) {
            usuario.setPassword(passwordEncoder.encode(dto.getPassword()));
        }

        usuario.getRoles().clear();
        updateRoles(usuario, dto.getRoleIds());

        Usuario updated = usuarioRepository.save(usuario);
        return mapToDTO(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id " + id));

        if ("jefe@vivero.com".equalsIgnoreCase(usuario.getUsername())) {
            throw new RuntimeException("El usuario JEFE no puede ser eliminado");
        }

        usuarioRepository.deleteUsuarioRolAssociations(id);
        usuarioRepository.delete(usuario);
    }

    private void updateRoles(Usuario usuario, List<Long> roleIds) {
        if (roleIds == null) return;
        
        usuario.getRoles().clear();
        for (Long roleId : roleIds) {
            Rol rol = rolRepository.findById(roleId)
                    .orElseThrow(() -> new RuntimeException("Rol no encontrado con id " + roleId));
            
            usuario.getRoles().add(rol);
        }
    }

    private UsuarioResponseDTO mapToDTO(Usuario usuario) {
        List<com.vivero.gestion.dto.RolDTO> rolesDto = usuario.getRoles().stream()
                .map(rol -> {
                    com.vivero.gestion.dto.RolDTO dto = new com.vivero.gestion.dto.RolDTO();
                    dto.setId(rol.getId());
                    dto.setNombre(rol.getNombre());
                    // Not mapping all permissions here to keep it light, unless needed by frontend
                    return dto;
                })
                .collect(Collectors.toList());

        return UsuarioResponseDTO.builder()
                .id(usuario.getId())
                .username(usuario.getUsername())
                .roles(rolesDto)
                .build();
    }
}
