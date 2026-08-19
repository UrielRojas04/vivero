package com.vivero.gestion.services.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.ProveedorDTO;
import com.vivero.gestion.models.Proveedor;
import com.vivero.gestion.repositories.ProveedorRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.ProveedorService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProveedorServiceImpl implements ProveedorService {

    private final ProveedorRepository proveedorRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ProveedorDTO> getAll() {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<Proveedor> proveedores = (unidadId != null)
                ? proveedorRepository.findAllByUnidadNegocioId(unidadId)
                : proveedorRepository.findAll();
        return proveedores.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProveedorDTO getById(Long id) {
        return mapToDTO(buscarProveedor(id));
    }

    @Override
    @Transactional
    public ProveedorDTO create(ProveedorDTO dto) {
        validarNombre(dto);

        Proveedor proveedor = new Proveedor();
        proveedor.setNombre(dto.getNombre().trim());
        proveedor.setTelefono(dto.getTelefono());
        proveedor.setContacto(dto.getContacto());

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            proveedor.setUnidadNegocio(unidadNegocioRepository.getReferenceById(unidadId));
        }

        return mapToDTO(proveedorRepository.save(proveedor));
    }

    @Override
    @Transactional
    public ProveedorDTO update(Long id, ProveedorDTO dto) {
        validarNombre(dto);

        Proveedor proveedor = buscarProveedor(id);
        proveedor.setNombre(dto.getNombre().trim());
        proveedor.setTelefono(dto.getTelefono());
        proveedor.setContacto(dto.getContacto());

        return mapToDTO(proveedorRepository.save(proveedor));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Proveedor proveedor = buscarProveedor(id);
        proveedor.setDeleted(true);
        proveedorRepository.save(proveedor);
    }

    private Proveedor buscarProveedor(Long id) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            return proveedorRepository.findByIdAndUnidadNegocioId(id, unidadId)
                    .orElseThrow(() -> new RuntimeException("Proveedor no encontrado o no pertenece a la unidad."));
        }
        return proveedorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado con id " + id));
    }

    private void validarNombre(ProveedorDTO dto) {
        if (dto.getNombre() == null || dto.getNombre().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del proveedor es obligatorio.");
        }
    }

    private ProveedorDTO mapToDTO(Proveedor proveedor) {
        return ProveedorDTO.builder()
                .id(proveedor.getId())
                .nombre(proveedor.getNombre())
                .telefono(proveedor.getTelefono())
                .contacto(proveedor.getContacto())
                .build();
    }
}
