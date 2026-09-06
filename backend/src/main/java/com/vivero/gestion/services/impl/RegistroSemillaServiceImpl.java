package com.vivero.gestion.services.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.RegistroSemillaDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EstadoRegistroSemilla;
import com.vivero.gestion.models.RegistroSemilla;
import com.vivero.gestion.models.UnidadCantidadSemilla;
import com.vivero.gestion.models.UnidadContenidoSobre;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.models.VariedadBandeja;
import com.vivero.gestion.models.VariedadPlanta;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.RegistroSemillaRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.repositories.VariedadBandejaRepository;
import com.vivero.gestion.repositories.VariedadPlantaRepository;
import com.vivero.gestion.services.RegistroSemillaService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RegistroSemillaServiceImpl implements RegistroSemillaService {

    private final RegistroSemillaRepository registroSemillaRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final VariedadPlantaRepository variedadPlantaRepository;
    private final VariedadBandejaRepository variedadBandejaRepository;

    @Override
    public List<RegistroSemillaDTO> obtenerTodos() {
        return registroSemillaRepository.findAllByOrderByFechaRecepcionDesc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public RegistroSemillaDTO obtenerPorId(Long id) {
        RegistroSemilla registro = registroSemillaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registro de semilla no encontrado con ID: " + id));
        return mapToDTO(registro);
    }

    @Override
    @Transactional
    public RegistroSemillaDTO crear(RegistroSemillaDTO dto, Long usuarioId) {
        validarYNormalizar(dto);

        RegistroSemilla registro = new RegistroSemilla();
        aplicarCamposBasicos(registro, dto);
        registro.setFechaRegistro(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));

        if (usuarioId != null) {
            registro.setUsuarioRecibe(usuarioRepository.findById(usuarioId).orElse(null));
        }

        RegistroSemilla saved = registroSemillaRepository.save(registro);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public RegistroSemillaDTO actualizar(Long id, RegistroSemillaDTO dto) {
        validarYNormalizar(dto);

        RegistroSemilla registro = registroSemillaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registro de semilla no encontrado con ID: " + id));
        aplicarCamposBasicos(registro, dto);
        RegistroSemilla saved = registroSemillaRepository.save(registro);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        registroSemillaRepository.deleteById(id);
    }

    @Override
    @Transactional
    public RegistroSemillaDTO consumir(Long id) {
        RegistroSemilla registro = registroSemillaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registro de semilla no encontrado con ID: " + id));

        // CONSUMIDA es terminal (change trazabilidad-semillas-siembras, Decisión 1 de
        // design.md): no hay forma de revertirla desde la interfaz, así que tampoco tiene
        // sentido volver a "consumir" un registro que ya lo está.
        if (registro.getEstado() == EstadoRegistroSemilla.CONSUMIDA) {
            throw new RuntimeException("El registro de semilla ya está consumido");
        }

        registro.setEstado(EstadoRegistroSemilla.CONSUMIDA);
        RegistroSemilla saved = registroSemillaRepository.save(registro);
        return mapToDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RegistroSemillaDTO> obtenerAlertas() {
        // Misma ventana de 5 días que SiembraServiceImpl.obtenerAlertas() (pedido del dueño
        // 2026-09-05, "notificación de sembrar semilla"). Sólo SIN_SEMBRAR: una vez vinculado a
        // una siembra (SEMBRADAS) el aviso ya cumplió su propósito -- si hace falta sembrar el
        // resto de un lote repartido en tandas, es una decisión manual del dueño, no algo que
        // el sistema deba seguir recordando. CONSUMIDA nunca aparece.
        java.time.LocalDate limit = java.time.LocalDate.now().plusDays(5);
        return registroSemillaRepository.findAll().stream()
                .filter(r -> r.getEstado() == EstadoRegistroSemilla.SIN_SEMBRAR
                        && r.getFechaSiembraProgramada() != null
                        && !r.getFechaSiembraProgramada().isAfter(limit))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Valida y normaliza un RegistroSemillaDTO antes de persistirlo, siguiendo el estilo de
     * validarYNormalizarOrigen() de SiembraServiceImpl. Reglas, en orden (tarea 2.4):
     * - lote, descripcionSemilla, cantidad, unidadCantidad o fechaRecepcion nulos/en blanco -> rechazo.
     * - nombreQuienTrajo en blanco cuando no hay clienteId -> rechazo (con clienteId, el
     *   snapshot lo completa después en aplicarCamposBasicos).
     * - unidadCantidad != SOBRES -> se fuerza contenidoPorSobre a null, descartando cualquier
     *   valor recibido (Decisión 4).
     */
    private void validarYNormalizar(RegistroSemillaDTO dto) {
        if (dto.getLote() == null || dto.getLote().isBlank()) {
            throw new RuntimeException("El lote es obligatorio");
        }
        if (dto.getDescripcionSemilla() == null || dto.getDescripcionSemilla().isBlank()) {
            throw new RuntimeException("La descripción de la semilla es obligatoria");
        }
        if (dto.getCantidad() == null) {
            throw new RuntimeException("La cantidad es obligatoria");
        }
        if (dto.getUnidadCantidad() == null) {
            throw new RuntimeException("La unidad de cantidad es obligatoria");
        }
        if (dto.getFechaRecepcion() == null) {
            throw new RuntimeException("La fecha de recepción es obligatoria");
        }
        if (dto.getClienteId() == null
                && (dto.getNombreQuienTrajo() == null || dto.getNombreQuienTrajo().isBlank())) {
            throw new RuntimeException("El nombre de quien trajo la semilla es obligatorio cuando no hay cliente vinculado");
        }
        if (dto.getUnidadCantidad() != UnidadCantidadSemilla.SOBRES) {
            dto.setContenidoPorSobre(null);
            dto.setContenidoPorSobreUnidad(null);
        }
    }

    private void aplicarCamposBasicos(RegistroSemilla registro, RegistroSemillaDTO dto) {
        registro.setFechaRecepcion(dto.getFechaRecepcion());
        registro.setLote(dto.getLote());

        // Mismo patrón "buscar o escribir libre" que cliente/nombreQuienTrajo (pedido del
        // dueño 2026-09-04): con variedadPlantaId, descripcionSemilla es un snapshot del
        // nombre de la variedad -- NUNCA lo que venga en el DTO -- para que el registro
        // histórico sobreviva a un futuro rename de la variedad. Sin variedadPlantaId, se usa
        // el texto libre tal cual venga.
        if (dto.getVariedadPlantaId() != null) {
            VariedadPlanta variedad = variedadPlantaRepository.findById(dto.getVariedadPlantaId()).orElse(null);
            registro.setVariedadPlanta(variedad);
            registro.setDescripcionSemilla(variedad != null ? variedad.getNombre() : dto.getDescripcionSemilla());
        } else {
            registro.setVariedadPlanta(null);
            registro.setDescripcionSemilla(dto.getDescripcionSemilla());
        }

        registro.setCantidad(dto.getCantidad());
        registro.setUnidadCantidad(dto.getUnidadCantidad());
        registro.setContenidoPorSobre(dto.getContenidoPorSobre());
        registro.setContenidoPorSobreUnidad(dto.getContenidoPorSobreUnidad());
        if (dto.getVariedadBandejaId() != null) {
            VariedadBandeja bandeja = variedadBandejaRepository.findById(dto.getVariedadBandejaId()).orElse(null);
            registro.setVariedadBandeja(bandeja);
        } else {
            registro.setVariedadBandeja(null);
        }
        registro.setCantidadBandejas(dto.getCantidadBandejas());
        registro.setObservaciones(dto.getObservaciones());
        registro.setFechaEntrega(dto.getFechaEntrega());
        registro.setFechaSiembraProgramada(dto.getFechaSiembraProgramada());

        if (dto.getClienteId() != null) {
            // Snapshot, NO referencia viva (Decisión 2 / tarea 2.5): se copian
            // nombreRazonSocial y telefono del Cliente al momento del alta, así el registro
            // conserva esos datos aunque el cliente se borre lógicamente después.
            Cliente cliente = clienteRepository.findById(dto.getClienteId()).orElse(null);
            registro.setCliente(cliente);
            if (cliente != null) {
                registro.setNombreQuienTrajo(cliente.getNombreRazonSocial());
                registro.setTelefonoContacto(cliente.getTelefono());
            } else {
                registro.setNombreQuienTrajo(dto.getNombreQuienTrajo());
                registro.setTelefonoContacto(dto.getTelefonoContacto());
            }
        } else {
            registro.setCliente(null);
            registro.setNombreQuienTrajo(dto.getNombreQuienTrajo());
            registro.setTelefonoContacto(dto.getTelefonoContacto());
        }
    }

    private RegistroSemillaDTO mapToDTO(RegistroSemilla registro) {
        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setId(registro.getId());
        dto.setFechaRecepcion(registro.getFechaRecepcion());
        dto.setLote(registro.getLote());
        if (registro.getCliente() != null) {
            dto.setClienteId(registro.getCliente().getId());
        }
        dto.setNombreQuienTrajo(registro.getNombreQuienTrajo());
        dto.setTelefonoContacto(registro.getTelefonoContacto());
        dto.setDescripcionSemilla(registro.getDescripcionSemilla());
        if (registro.getVariedadPlanta() != null) {
            dto.setVariedadPlantaId(registro.getVariedadPlanta().getId());
        }
        dto.setCantidad(registro.getCantidad());
        dto.setUnidadCantidad(registro.getUnidadCantidad());
        dto.setContenidoPorSobre(registro.getContenidoPorSobre());
        dto.setContenidoPorSobreUnidad(registro.getContenidoPorSobreUnidad());
        if (registro.getVariedadBandeja() != null) {
            dto.setVariedadBandejaId(registro.getVariedadBandeja().getId());
            dto.setVariedadBandejaNombre(registro.getVariedadBandeja().getNombre());
        }
        dto.setCantidadBandejas(registro.getCantidadBandejas());
        dto.setObservaciones(registro.getObservaciones());
        Usuario usuario = registro.getUsuarioRecibe();
        if (usuario != null) {
            dto.setUsuarioRecibeId(usuario.getId());
            dto.setUsuarioRecibeNombre(usuario.getUsername());
        }
        dto.setFechaRegistro(registro.getFechaRegistro());
        dto.setFechaEntrega(registro.getFechaEntrega());
        dto.setFechaSiembraProgramada(registro.getFechaSiembraProgramada());
        dto.setEstado(registro.getEstado());

        // totalSemillas es derivado y NUNCA se persiste (tarea 2.6): sólo tiene sentido con
        // unidadCantidad == SOBRES y contenidoPorSobre cargado; en cualquier otro caso queda nulo.
        // contenidoPorSobreUnidad == GRAMOS (pedido del dueño 2026-09-05, "3 sobres 10gr c/u"):
        // el sobre está definido por peso, no por conteo -- hace falta además
        // VariedadPlanta.semillasPorGramo para convertir a semillas; sin ese dato el total no se
        // calcula, igual que GRAMOS directo sin ese dato.
        if (registro.getUnidadCantidad() == UnidadCantidadSemilla.SOBRES
                && registro.getContenidoPorSobre() != null
                && registro.getCantidad() != null) {
            if (registro.getContenidoPorSobreUnidad() == UnidadContenidoSobre.GRAMOS) {
                if (registro.getVariedadPlanta() != null && registro.getVariedadPlanta().getSemillasPorGramo() != null) {
                    dto.setTotalSemillas(registro.getCantidad()
                            .multiply(java.math.BigDecimal.valueOf(registro.getContenidoPorSobre()))
                            .multiply(registro.getVariedadPlanta().getSemillasPorGramo()));
                }
            } else {
                dto.setTotalSemillas(registro.getCantidad().multiply(
                        java.math.BigDecimal.valueOf(registro.getContenidoPorSobre())));
            }
        }

        // GRAMOS -> semillas (pedido del dueño 2026-09-05): sólo cuando el registro está
        // vinculado a una VariedadPlanta real del catálogo que tiene semillasPorGramo cargado --
        // sin ese dato (variedad vieja, o nombre libre sin vínculo) sigue sin conversión, igual
        // que siempre.
        if (registro.getUnidadCantidad() == UnidadCantidadSemilla.GRAMOS
                && registro.getVariedadPlanta() != null
                && registro.getVariedadPlanta().getSemillasPorGramo() != null
                && registro.getCantidad() != null) {
            dto.setTotalSemillas(registro.getCantidad().multiply(
                    registro.getVariedadPlanta().getSemillasPorGramo()));
        }

        return dto;
    }
}
