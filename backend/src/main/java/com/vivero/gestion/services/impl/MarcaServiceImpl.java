package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.MarcaDTO;
import com.vivero.gestion.models.Marca;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.MarcaRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.MarcaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MarcaServiceImpl implements MarcaService {

    private final MarcaRepository marcaRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final ProductoRepository productoRepository;

    @Autowired
    public MarcaServiceImpl(MarcaRepository marcaRepository, UnidadNegocioRepository unidadNegocioRepository, ProductoRepository productoRepository) {
        this.marcaRepository = marcaRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.productoRepository = productoRepository;
    }

    @Override
    @Transactional
    public MarcaDTO crearMarca(MarcaDTO dto) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId == null) {
            throw new RuntimeException("Unidad de negocio no especificada en el contexto");
        }
        UnidadNegocio unidad = unidadNegocioRepository.findById(unidadId)
            .orElseThrow(() -> new RuntimeException("Unidad de negocio no encontrada"));

        Marca marca = new Marca();
        marca.setNombre(dto.getNombre());
        marca.setUnidadNegocio(unidad);

        Marca guardada = marcaRepository.save(marca);
        return new MarcaDTO(guardada.getId(), guardada.getNombre(), false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarcaDTO> obtenerTodasLasMarcas() {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<Marca> marcas = (unidadId != null) 
            ? marcaRepository.findAllByUnidadNegocioId(unidadId) 
            : marcaRepository.findAll();

        return marcas.stream()
                .map(m -> new MarcaDTO(m.getId(), m.getNombre(), productoRepository.existsByMarcaId(m.getId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MarcaDTO actualizarMarca(Long id, MarcaDTO dto) {
        Marca marca = marcaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Marca no encontrada"));
                
        marca.setNombre(dto.getNombre());
        Marca actualizada = marcaRepository.save(marca);
        return new MarcaDTO(actualizada.getId(), actualizada.getNombre(), productoRepository.existsByMarcaId(actualizada.getId()));
    }

    @Override
    @Transactional
    public void eliminarMarca(Long id) {
        Marca marca = marcaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Marca no encontrada"));
                
        if (productoRepository.existsByMarcaId(id)) {
            throw new RuntimeException("No se puede eliminar la marca porque hay productos vinculados a ella.");
        }
        
        marcaRepository.delete(marca);
    }
}
