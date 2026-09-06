package com.vivero.gestion.services.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.SiembraDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EstadoRegistroSemilla;
import com.vivero.gestion.models.EstadoSiembra;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.RegistroSemilla;
import com.vivero.gestion.models.Siembra;
import com.vivero.gestion.models.TipoOrigenSiembra;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.RegistroSemillaRepository;
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
    private final RegistroSemillaRepository registroSemillaRepository;
    private final ClienteRepository clienteRepository;

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

    /**
     * Valida y normaliza el origen de la semilla de una siembra antes de persistirla.
     * Reglas, en orden:
     * - tipoOrigen nulo -> rechazo.
     * - numeroSiembra nulo o en blanco -> rechazo.
     * - tipoOrigen == SOBRE y codigoLote nulo o en blanco -> rechazo.
     * - tipoOrigen == SUELTO -> se fuerza codigoLote a null, descartando cualquier valor recibido.
     */
    private void validarYNormalizarOrigen(SiembraDTO dto) {
        if (dto.getTipoOrigen() == null) {
            throw new RuntimeException("El origen de la semilla es obligatorio");
        }
        if (dto.getNumeroSiembra() == null || dto.getNumeroSiembra().isBlank()) {
            throw new RuntimeException("El número de siembra es obligatorio");
        }
        if (dto.getTipoOrigen() == TipoOrigenSiembra.SOBRE
                && (dto.getCodigoLote() == null || dto.getCodigoLote().isBlank())) {
            throw new RuntimeException("El código de lote es obligatorio cuando el origen es SOBRE");
        }
        if (dto.getTipoOrigen() == TipoOrigenSiembra.SUELTO) {
            dto.setCodigoLote(null);
            // Un origen SUELTO no viene de ningún sobre registrado (change
            // trazabilidad-semillas-siembras, 2026-09-04): mismo criterio que codigoLote, se
            // descarta cualquier vínculo recibido en vez de rechazar el registro.
            dto.setRegistroSemillaId(null);
        }
    }

    /**
     * Vincula (o desvincula) una Siembra con un RegistroSemilla existente (change
     * trazabilidad-semillas-siembras, Decisión 2 de design.md). El estado del registro pasa a
     * SEMBRADAS en el momento de vincular -- no espera a finalizarSiembra -- y sólo la
     * primera vez (SEMBRADAS -> SEMBRADAS es idempotente, permite repartir un mismo registro
     * en varias tandas). Un registro CONSUMIDA no se puede vincular.
     */
    private void vincularRegistroSemilla(Siembra siembra, Long registroSemillaId) {
        if (registroSemillaId == null) {
            siembra.setRegistroSemilla(null);
            return;
        }

        RegistroSemilla registro = registroSemillaRepository.findById(registroSemillaId)
                .orElseThrow(() -> new RuntimeException("Registro de semilla no encontrado con ID: " + registroSemillaId));

        if (registro.getEstado() == EstadoRegistroSemilla.CONSUMIDA) {
            throw new RuntimeException("No se puede vincular un registro de semilla ya consumido");
        }

        siembra.setRegistroSemilla(registro);

        if (registro.getEstado() == EstadoRegistroSemilla.SIN_SEMBRAR) {
            registro.setEstado(EstadoRegistroSemilla.SEMBRADAS);
            registroSemillaRepository.save(registro);
        }
    }

    /**
     * Vincula (o desvincula) una Siembra con un Cliente real (pedido del dueño 2026-09-05:
     * "ahora sí necesitamos asociar la siembra a un cliente"). Con clienteId, dueno es un
     * snapshot obligatorio del nombre del cliente -- NUNCA lo que venga en el DTO -- mismo
     * patrón exacto que RegistroSemilla con su cliente/nombreQuienTrajo. Sin clienteId (el
     * caso "Jefe / Vivero propio", o un nombre libre sin cliente real vinculado -- vuelta
     * atrás del 2026-09-05, ver comentario en Siembra.cliente), se usa el dueno tal cual
     * venga en el DTO. Este método nunca exigió cliente real: ese comportamiento, cuando
     * existió, vivía sólo en el frontend.
     */
    private void aplicarCliente(Siembra siembra, SiembraDTO dto) {
        if (dto.getClienteId() != null) {
            Cliente cliente = clienteRepository.findById(dto.getClienteId()).orElse(null);
            siembra.setCliente(cliente);
            siembra.setDueno(cliente != null ? cliente.getNombreRazonSocial() : dto.getDueno());
        } else {
            siembra.setCliente(null);
            siembra.setDueno(dto.getDueno());
        }
    }

    /**
     * Valida y normaliza el período de siembra de una siembra antes de persistirla.
     * Reglas, en orden:
     * - fechaSiembraInicio nula -> rechazo.
     * - fechaSiembraFin nula -> se normaliza a fechaSiembraInicio (siembra de un
     *   solo día: ambos campos quedan con la misma fecha).
     * - fechaSiembraFin anterior a fechaSiembraInicio -> rechazo.
     */
    private void validarYNormalizarFechaSiembra(SiembraDTO dto) {
        if (dto.getFechaSiembraInicio() == null) {
            throw new RuntimeException("La fecha de siembra es obligatoria");
        }
        if (dto.getFechaSiembraFin() == null) {
            dto.setFechaSiembraFin(dto.getFechaSiembraInicio());
        }
        if (dto.getFechaSiembraFin().isBefore(dto.getFechaSiembraInicio())) {
            throw new RuntimeException("La fecha de fin de siembra no puede ser anterior a la de inicio");
        }
    }

    @Override
    @Transactional
    public SiembraDTO crearSiembra(SiembraDTO dto) {
        validarYNormalizarOrigen(dto);
        validarYNormalizarFechaSiembra(dto);

        Siembra siembra = new Siembra();
        if (dto.getVariedadPlanta() != null && dto.getVariedadPlanta().getId() != null) {
            siembra.setVariedadPlanta(variedadPlantaRepository.findById(dto.getVariedadPlanta().getId()).orElse(null));
        }
        if (dto.getVariedadBandeja() != null && dto.getVariedadBandeja().getId() != null) {
            siembra.setVariedadBandeja(variedadBandejaRepository.findById(dto.getVariedadBandeja().getId()).orElse(null));
        }
        siembra.setFechaEstimada(dto.getFechaEstimada());
        aplicarCliente(siembra, dto);
        siembra.setCodigoLote(dto.getCodigoLote());
        siembra.setNumeroSiembra(dto.getNumeroSiembra());
        siembra.setFechaSiembraInicio(dto.getFechaSiembraInicio());
        siembra.setFechaSiembraFin(dto.getFechaSiembraFin());
        siembra.setTipoOrigen(dto.getTipoOrigen());
        siembra.setCantidad(dto.getCantidad());
        siembra.setObservaciones(dto.getObservaciones());
        siembra.setEstado(EstadoSiembra.EN_PROCESO);
        vincularRegistroSemilla(siembra, dto.getRegistroSemillaId());

        Siembra saved = siembraRepository.save(siembra);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public SiembraDTO actualizarSiembra(Long id, SiembraDTO dto) {
        validarYNormalizarOrigen(dto);
        validarYNormalizarFechaSiembra(dto);

        Siembra siembra = siembraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Siembra no encontrada con ID: " + id));

        if (dto.getVariedadPlanta() != null && dto.getVariedadPlanta().getId() != null) {
            siembra.setVariedadPlanta(variedadPlantaRepository.findById(dto.getVariedadPlanta().getId()).orElse(null));
        }
        if (dto.getVariedadBandeja() != null && dto.getVariedadBandeja().getId() != null) {
            siembra.setVariedadBandeja(variedadBandejaRepository.findById(dto.getVariedadBandeja().getId()).orElse(null));
        }
        siembra.setFechaEstimada(dto.getFechaEstimada());
        aplicarCliente(siembra, dto);
        siembra.setCodigoLote(dto.getCodigoLote());
        siembra.setNumeroSiembra(dto.getNumeroSiembra());
        siembra.setFechaSiembraInicio(dto.getFechaSiembraInicio());
        siembra.setFechaSiembraFin(dto.getFechaSiembraFin());
        siembra.setTipoOrigen(dto.getTipoOrigen());
        siembra.setCantidad(dto.getCantidad());
        siembra.setObservaciones(dto.getObservaciones());
        vincularRegistroSemilla(siembra, dto.getRegistroSemillaId());

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
        mov.setTipoMovimiento(com.vivero.gestion.models.TipoMovimientoStock.INGRESO);
        mov.setCostoUnitario(producto.getCostoProducto() != null ? producto.getCostoProducto() : java.math.BigDecimal.ZERO);
        mov.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        mov.setUsuario(usuario);
        movimientoStockRepository.save(mov);

        // Actualizar siembra
        siembra.setEstado(EstadoSiembra.FINALIZADA);
        Siembra saved = siembraRepository.save(siembra);

        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public SiembraDTO pasarAStock(Long id, com.vivero.gestion.dto.PasarStockRequestDTO request) {
        Siembra siembra = siembraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Siembra no encontrada con ID: " + id));

        if (siembra.getEstado() != EstadoSiembra.FINALIZADA && siembra.getEstado() != EstadoSiembra.EN_PROCESO) {
            throw new RuntimeException("La siembra no puede pasarse a stock en estado: " + siembra.getEstado());
        }

        // Crear el nuevo producto
        Producto producto = new Producto();
        producto.setNombre(siembra.getVariedadPlanta() != null ? siembra.getVariedadPlanta().getNombre() : "Siembra Lote " + siembra.getCodigoLote());
        producto.setDescripcion("Siembra pasada a stock. Bandeja: " +
            (siembra.getVariedadBandeja() != null ? siembra.getVariedadBandeja().getNombre() : "N/A"));
        producto.setPrecio(request.getPrecioVenta());
        producto.setStock(request.getStock());
        producto.setLote(siembra.getCodigoLote());
        producto.setNumeroSiembra(siembra.getNumeroSiembra());
        producto.setDueno(siembra.getDueno());
        
        com.vivero.gestion.models.UnidadNegocio un = new com.vivero.gestion.models.UnidadNegocio();
        un.setId(1L);
        producto.setUnidadNegocio(un);

        productoRepository.save(producto);

        // Actualizar siembra
        siembra.setEstado(EstadoSiembra.EN_STOCK);
        Siembra saved = siembraRepository.save(siembra);

        return mapToDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SiembraDTO> obtenerAlertas() {
        java.time.LocalDate limit = java.time.LocalDate.now().plusDays(5);
        return siembraRepository.findAll().stream()
                .filter(s -> s.getEstado() == EstadoSiembra.FINALIZADA || 
                            (s.getEstado() == EstadoSiembra.EN_PROCESO && s.getFechaEstimada() != null && !s.getFechaEstimada().isAfter(limit)))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private SiembraDTO mapToDTO(Siembra siembra) {
        SiembraDTO dto = new SiembraDTO();
        dto.setId(siembra.getId());
        
        if (siembra.getVariedadPlanta() != null) {
            VariedadPlantaDTO vpDto = new VariedadPlantaDTO();
            vpDto.setId(siembra.getVariedadPlanta().getId());
            vpDto.setNombre(siembra.getVariedadPlanta().getNombre());
            vpDto.setDescripcion(siembra.getVariedadPlanta().getDescripcion());
            vpDto.setDiasEnero(siembra.getVariedadPlanta().getDiasEnero());
            vpDto.setDiasFebrero(siembra.getVariedadPlanta().getDiasFebrero());
            vpDto.setDiasMarzo(siembra.getVariedadPlanta().getDiasMarzo());
            vpDto.setDiasAbril(siembra.getVariedadPlanta().getDiasAbril());
            vpDto.setDiasMayo(siembra.getVariedadPlanta().getDiasMayo());
            vpDto.setDiasJunio(siembra.getVariedadPlanta().getDiasJunio());
            vpDto.setDiasJulio(siembra.getVariedadPlanta().getDiasJulio());
            vpDto.setDiasAgosto(siembra.getVariedadPlanta().getDiasAgosto());
            vpDto.setDiasSeptiembre(siembra.getVariedadPlanta().getDiasSeptiembre());
            vpDto.setDiasOctubre(siembra.getVariedadPlanta().getDiasOctubre());
            vpDto.setDiasNoviembre(siembra.getVariedadPlanta().getDiasNoviembre());
            vpDto.setDiasDiciembre(siembra.getVariedadPlanta().getDiasDiciembre());
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
        dto.setCodigoLote(siembra.getCodigoLote());
        dto.setNumeroSiembra(siembra.getNumeroSiembra());
        dto.setFechaSiembraInicio(siembra.getFechaSiembraInicio());
        dto.setFechaSiembraFin(siembra.getFechaSiembraFin());
        dto.setTipoOrigen(siembra.getTipoOrigen());
        dto.setCantidad(siembra.getCantidad());
        dto.setEstado(siembra.getEstado());
        dto.setObservaciones(siembra.getObservaciones());

        if (siembra.getCliente() != null) {
            dto.setClienteId(siembra.getCliente().getId());
        }

        if (siembra.getRegistroSemilla() != null) {
            dto.setRegistroSemillaId(siembra.getRegistroSemilla().getId());
            dto.setRegistroSemillaLote(siembra.getRegistroSemilla().getLote());
        }

        return dto;
    }
}
