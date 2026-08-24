package com.vivero.gestion.services.impl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.ProductoResumenProveedorDTO;
import com.vivero.gestion.dto.ProveedorDTO;
import com.vivero.gestion.dto.ProveedorDescuentoDTO;
import com.vivero.gestion.models.Proveedor;
import com.vivero.gestion.models.ProveedorDescuento;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.ProductoResumenProveedorProjection;
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
    private final ProductoRepository productoRepository;

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
        validarPerfilCosteo(dto);
        validarNombreDuplicado(dto, null);

        Proveedor proveedor = new Proveedor();
        proveedor.setNombre(dto.getNombre().trim());
        proveedor.setTelefono(dto.getTelefono());
        proveedor.setContacto(dto.getContacto());
        aplicarPerfilCosteo(proveedor, dto);

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            proveedor.setUnidadNegocio(unidadNegocioRepository.getReferenceById(unidadId));
        }

        reemplazarDescuentos(proveedor, dto.getDescuentosPorDefecto());

        return mapToDTO(proveedorRepository.save(proveedor));
    }

    @Override
    @Transactional
    public ProveedorDTO update(Long id, ProveedorDTO dto) {
        validarNombre(dto);
        validarPerfilCosteo(dto);
        validarNombreDuplicado(dto, id);

        Proveedor proveedor = buscarProveedor(id);
        proveedor.setNombre(dto.getNombre().trim());
        proveedor.setTelefono(dto.getTelefono());
        proveedor.setContacto(dto.getContacto());
        aplicarPerfilCosteo(proveedor, dto);

        reemplazarDescuentos(proveedor, dto.getDescuentosPorDefecto());

        return mapToDTO(proveedorRepository.save(proveedor));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Proveedor proveedor = buscarProveedor(id);
        proveedor.setDeleted(true);
        proveedorRepository.save(proveedor);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductoResumenProveedorDTO> obtenerProductosAsociados(Long proveedorId) {
        // Verifica que el proveedor exista (y pertenezca a la unidad activa) antes de consultar
        // sus productos, mismo criterio que el resto del service.
        buscarProveedor(proveedorId);

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId == null) {
            return new ArrayList<>();
        }
        List<ProductoResumenProveedorProjection> filas = productoRepository.findResumenPorProveedor(proveedorId, unidadId);
        return filas.stream()
                .map(f -> new ProductoResumenProveedorDTO(f.getId(), f.getNombre(), f.getCostoActual()))
                .collect(Collectors.toList());
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

    /**
     * Nombre duplicado por unidad de negocio, normalizado (trim + mayúsculas) — tarea 3.5. Sin
     * unidad activa en contexto (caso hoy inexistente en producción, sólo posible con un usuario
     * sin unidad asignada) se omite el chequeo: no hay "findAll sin límite" al que recurrir sin
     * violar la regla dura 6, y el caso no está en alcance de este change.
     */
    private void validarNombreDuplicado(ProveedorDTO dto, Long idActual) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId == null) {
            return;
        }
        proveedorRepository.findByUnidadNegocioIdAndNombreNormalizado(unidadId, dto.getNombre())
                .filter(existente -> idActual == null || !existente.getId().equals(idActual))
                .ifPresent(existente -> {
                    throw new IllegalArgumentException(
                            "Ya existe un proveedor llamado \"" + existente.getNombre() + "\" en esta unidad de negocio.");
                });
    }

    /**
     * Valida el perfil de costeo del DTO (tarea 3.4): cada descuento por defecto debe tener
     * nombre no vacío y porcentaje &gt;= 0; costoEnvioPorDefectoPorcentaje, cuando viene
     * informado, también debe ser &gt;= 0; e ivaPorDefectoPorcentaje sólo se exige cuando
     * ivaIncluidoEnPrecio = false (Decisión 4 de design.md — con IVA incluido el producto se
     * escribe en 0 explícito, no necesita ningún número de referencia).
     */
    private void validarPerfilCosteo(ProveedorDTO dto) {
        if (dto.getDescuentosPorDefecto() != null) {
            for (ProveedorDescuentoDTO d : dto.getDescuentosPorDefecto()) {
                if (d.getNombre() == null || d.getNombre().trim().isEmpty()) {
                    throw new IllegalArgumentException("Cada descuento por defecto debe tener un nombre.");
                }
                if (d.getPorcentaje() == null || d.getPorcentaje().compareTo(BigDecimal.ZERO) < 0) {
                    throw new IllegalArgumentException(
                            "El porcentaje del descuento \"" + d.getNombre() + "\" no puede ser negativo.");
                }
            }
        }
        if (dto.getCostoEnvioPorDefectoPorcentaje() != null
                && dto.getCostoEnvioPorDefectoPorcentaje().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El envío por defecto no puede ser negativo.");
        }
        if (!dto.isIvaIncluidoEnPrecio()
                && (dto.getIvaPorDefectoPorcentaje() == null || dto.getIvaPorDefectoPorcentaje().compareTo(BigDecimal.ZERO) < 0)) {
            throw new IllegalArgumentException(
                    "El IVA por defecto es obligatorio (y no puede ser negativo) cuando el IVA no está incluido en el precio.");
        }
    }

    private void aplicarPerfilCosteo(Proveedor proveedor, ProveedorDTO dto) {
        proveedor.setIvaIncluidoEnPrecio(dto.isIvaIncluidoEnPrecio());
        // ivaPorDefectoPorcentaje es sólo comodidad de tipeo (Decisión 1): cuando el IVA está
        // incluido en el precio no gobierna nada, así que se acepta tal cual venga (incluido
        // null) sin forzarlo a 0 — a diferencia de Producto.ivaPorcentaje, este campo nunca
        // participa de ningún cálculo.
        proveedor.setIvaPorDefectoPorcentaje(dto.getIvaPorDefectoPorcentaje());
        proveedor.setManejaDolares(dto.isManejaDolares());
        proveedor.setCostoEnvioPorDefectoPorcentaje(dto.getCostoEnvioPorDefectoPorcentaje());
        // ultimaCotizacionConocida/fechaUltimaCotizacion NO se escriben acá (tarea 5.4): no son
        // un campo editable del formulario de proveedor. Se dejan tal cual estén en la entidad —
        // sólo el flujo de confirmarRecepcion() del grupo 7 (fuera de alcance) las escribe.
    }

    private ProveedorDTO mapToDTO(Proveedor proveedor) {
        return ProveedorDTO.builder()
                .id(proveedor.getId())
                .nombre(proveedor.getNombre())
                .telefono(proveedor.getTelefono())
                .contacto(proveedor.getContacto())
                .ivaIncluidoEnPrecio(proveedor.isIvaIncluidoEnPrecio())
                .ivaPorDefectoPorcentaje(proveedor.getIvaPorDefectoPorcentaje())
                .manejaDolares(proveedor.isManejaDolares())
                .costoEnvioPorDefectoPorcentaje(proveedor.getCostoEnvioPorDefectoPorcentaje())
                .descuentosPorDefecto(
                        proveedor.getDescuentosPorDefecto() == null ? new ArrayList<>() :
                        proveedor.getDescuentosPorDefecto().stream()
                                .map(d -> new ProveedorDescuentoDTO(d.getNombre(), d.getPorcentaje()))
                                .collect(Collectors.toList())
                )
                .ultimaCotizacionConocida(proveedor.getUltimaCotizacionConocida())
                .fechaUltimaCotizacion(proveedor.getFechaUltimaCotizacion())
                .build();
    }

    /**
     * Reemplaza por completo la lista de descuentos por defecto con lo que trajo el DTO,
     * apoyándose en el orphanRemoval=true de Proveedor.descuentosPorDefecto — mismo patrón que
     * ProductoServiceImpl.reemplazarDescuentos().
     */
    private void reemplazarDescuentos(Proveedor proveedor, List<ProveedorDescuentoDTO> nuevos) {
        proveedor.getDescuentosPorDefecto().clear();
        if (nuevos == null) {
            return;
        }
        int orden = 0;
        for (ProveedorDescuentoDTO d : nuevos) {
            ProveedorDescuento entidad = new ProveedorDescuento();
            entidad.setProveedor(proveedor);
            entidad.setNombre(d.getNombre());
            entidad.setPorcentaje(d.getPorcentaje());
            entidad.setOrden(orden++);
            proveedor.getDescuentosPorDefecto().add(entidad);
        }
    }
}
