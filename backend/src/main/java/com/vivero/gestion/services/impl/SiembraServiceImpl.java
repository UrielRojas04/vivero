package com.vivero.gestion.services.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.SiembraDTO;
import com.vivero.gestion.models.EstadoSiembra;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.Siembra;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.SiembraRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.repositories.VariedadBandejaRepository;
import com.vivero.gestion.repositories.VariedadPlantaRepository;
import com.vivero.gestion.services.SiembraService;
import com.vivero.gestion.dto.VariedadPlantaDTO;
import com.vivero.gestion.dto.VariedadBandejaDTO;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SiembraServiceImpl implements SiembraService {

    private final SiembraRepository siembraRepository;
    private final ProductoRepository productoRepository;
    private final MovimientoStockRepository movimientoStockRepository;
    private final UsuarioRepository usuarioRepository;
    private final VariedadPlantaRepository variedadPlantaRepository;
    private final VariedadBandejaRepository variedadBandejaRepository;

    @Override
    public List<SiembraDTO> obtenerTodas() {
        return siembraRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public SiembraDTO obtenerPorId(Long id) {
        Siembra siembra = siembraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Siembra no encontrada con ID: " + id));
        return mapToDTO(siembra);
    }

    @Override
    @Transactional
    public SiembraDTO crearSiembra(SiembraDTO dto) {
        Siembra siembra = new Siembra();
        if (dto.getVariedadPlanta() != null && dto.getVariedadPlanta().getId() != null) {
            siembra.setVariedadPlanta(variedadPlantaRepository.findById(dto.getVariedadPlanta().getId()).orElse(null));
        }
        if (dto.getVariedadBandeja() != null && dto.getVariedadBandeja().getId() != null) {
            siembra.setVariedadBandeja(variedadBandejaRepository.findById(dto.getVariedadBandeja().getId()).orElse(null));
        }
        siembra.setFechaEstimada(dto.getFechaEstimada());
        siembra.setDueno(dto.getDueno());
        siembra.setNumeroLote(dto.getNumeroLote());
        siembra.setCantidad(dto.getCantidad());
        siembra.setEstado(EstadoSiembra.EN_PROCESO);

        Siembra saved = siembraRepository.save(siembra);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public SiembraDTO actualizarSiembra(Long id, SiembraDTO dto) {
        Siembra siembra = siembraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Siembra no encontrada con ID: " + id));

        if (dto.getVariedadPlanta() != null && dto.getVariedadPlanta().getId() != null) {
            siembra.setVariedadPlanta(variedadPlantaRepository.findById(dto.getVariedadPlanta().getId()).orElse(null));
        }
        if (dto.getVariedadBandeja() != null && dto.getVariedadBandeja().getId() != null) {
            siembra.setVariedadBandeja(variedadBandejaRepository.findById(dto.getVariedadBandeja().getId()).orElse(null));
        }
        siembra.setFechaEstimada(dto.getFechaEstimada());
        siembra.setDueno(dto.getDueno());
        siembra.setNumeroLote(dto.getNumeroLote());
        siembra.setCantidad(dto.getCantidad());

        Siembra saved = siembraRepository.save(siembra);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public void eliminarSiembra(Long id) {
        siembraRepository.deleteById(id);
    }

    @Override
    @Transactional
    public SiembraDTO finalizarSiembra(Long idSiembra, Long idProducto, Integer cantidadLograda, Long usuarioId) {
        Siembra siembra = siembraRepository.findById(idSiembra)
                .orElseThrow(() -> new RuntimeException("Siembra no encontrada con ID: " + idSiembra));

        if (siembra.getEstado() == EstadoSiembra.FINALIZADA) {
            throw new RuntimeException("La siembra ya se encuentra finalizada.");
        }

        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + idProducto));

        Usuario usuario = null;
        if (usuarioId != null) {
            usuario = usuarioRepository.findById(usuarioId).orElse(null);
        }

        // Ingresar al stock
        producto.setStock(producto.getStock() + cantidadLograda);
        productoRepository.save(producto);

        // Registrar movimiento
        MovimientoStock mov = new MovimientoStock();
        mov.setProducto(producto);
        mov.setCantidad(cantidadLograda);
        mov.setTipo("IN");
        mov.setMotivo("INGRESO_SIEMBRA LOTE " + siembra.getNumeroLote());
        mov.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        mov.setUsuario(usuario);
        movimientoStockRepository.save(mov);

        // Actualizar siembra
        siembra.setEstado(EstadoSiembra.FINALIZADA);
        Siembra saved = siembraRepository.save(siembra);

        return mapToDTO(saved);
    }

    private SiembraDTO mapToDTO(Siembra siembra) {
        SiembraDTO dto = new SiembraDTO();
        dto.setId(siembra.getId());
        
        if (siembra.getVariedadPlanta() != null) {
            VariedadPlantaDTO vpDto = new VariedadPlantaDTO();
            vpDto.setId(siembra.getVariedadPlanta().getId());
            vpDto.setNombre(siembra.getVariedadPlanta().getNombre());
            vpDto.setDescripcion(siembra.getVariedadPlanta().getDescripcion());
            vpDto.setDiasCrecimiento(siembra.getVariedadPlanta().getDiasCrecimiento());
            dto.setVariedadPlanta(vpDto);
        }
        
        if (siembra.getVariedadBandeja() != null) {
            VariedadBandejaDTO vbDto = new VariedadBandejaDTO();
            vbDto.setId(siembra.getVariedadBandeja().getId());
            vbDto.setNombre(siembra.getVariedadBandeja().getNombre());
            vbDto.setCantidadCeldas(siembra.getVariedadBandeja().getCantidadCeldas());
            dto.setVariedadBandeja(vbDto);
        }
        
        dto.setFechaEstimada(siembra.getFechaEstimada());
        dto.setDueno(siembra.getDueno());
        dto.setNumeroLote(siembra.getNumeroLote());
        dto.setCantidad(siembra.getCantidad());
        dto.setEstado(siembra.getEstado());
        return dto;
    }
}
