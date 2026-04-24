package com.vivero.gestion.controllers;

import com.vivero.gestion.models.*;
import com.vivero.gestion.repositories.*;
import com.vivero.gestion.services.BandejaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/bandejas")
public class BandejaController {

    @Autowired private BandejaService service;
    @Autowired private UbicacionRepository ubicacionRepository;
    @Autowired private BandejaRepository repository;
    @Autowired private MovimientoRepository movimientoRepository;
    @Autowired private VariedadRepository variedadRepository;

    /**
     * Lista todas las bandejas activas.
     */
    @GetMapping
    public List<Bandeja> listar() {
        return service.listarTodas();
    }

    /**
     * Registro inicial de siembra en semillero.
     */
    @PostMapping
    public Bandeja crear(@RequestBody Bandeja bandeja, @RequestParam String username) {
        bandeja.setUsuarioCreador(username);
        Bandeja guardada = service.guardar(bandeja);
        String nombrePlanta = obtenerNombreVariedad(guardada);
        registrarMovimiento(guardada.getCodigoLote(), nombrePlanta, "NUEVO", "Semillero", guardada.getCantidad(), username, "REGISTRO");
        return guardada;
    }

    /**
     * Actualización general de datos (Soluciona Error 405 y valida capacidad).
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Bandeja detalles, @RequestParam String username) {
        Bandeja b = service.buscarPorId(id);

        // Validación de capacidad: si aumenta la cantidad y tiene ubicación física asignada
        if (detalles.getCantidad() != null && detalles.getCantidad() > b.getCantidad() && b.getUbicacion() != null) {
            Integer ocupadas = repository.sumCantidadByUbicacionId(b.getUbicacion().getId());
            int diferencia = detalles.getCantidad() - b.getCantidad();
            if ((ocupadas != null ? ocupadas : 0) + diferencia > b.getUbicacion().getCapacidadMax()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("{\"message\": \"Acción no posible: No hay espacio en " + b.getUbicacion().getNombre() + "\"}");
            }
        }

        String nombrePlanta = obtenerNombreVariedad(b);
        String ubicacionNombre = b.getUbicacion() != null ? b.getUbicacion().getNombre() : "Semillero";

        // Actualización de campos
        b.setDuenio(detalles.getDuenio());
        b.setCantidad(detalles.getCantidad());
        b.setObservaciones(detalles.getObservaciones());

        Bandeja actualizada = service.guardar(b);

        // Registro de auditoría por edición
        registrarMovimiento(b.getCodigoLote(), nombrePlanta, ubicacionNombre, ubicacionNombre, b.getCantidad(), username, "EDICION");

        return ResponseEntity.ok(actualizada);
    }

    /**
     * Ubica bandejas del semillero en un invernadero.
     */
    @PutMapping("/{id}/asignar-ubicacion")
    public ResponseEntity<?> asignarUbicacion(@PathVariable Long id, @RequestParam Long ubicacionId, @RequestParam Integer cantidadAMover, @RequestParam String username) {
        Bandeja original = service.buscarPorId(id);
        Ubicacion u = ubicacionRepository.findById(ubicacionId).orElseThrow(() -> new RuntimeException("Ubicación no encontrada"));

        Integer ocupadas = repository.sumCantidadByUbicacionId(ubicacionId);
        if ((ocupadas != null ? ocupadas : 0) + cantidadAMover > u.getCapacidadMax()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"message\": \"Sin espacio disponible en " + u.getNombre() + "\"}");
        }

        Optional<Bandeja> existencia = repository.findByCodigoLoteAndUbicacionIdAndVendidaFalse(original.getCodigoLote(), ubicacionId);
        String nombrePlanta = obtenerNombreVariedad(original);

        if (existencia.isPresent()) {
            Bandeja ex = existencia.get();
            ex.setCantidad(ex.getCantidad() + cantidadAMover);
            acumularResponsableAsignacion(ex, username);
            repository.save(ex);
            if (cantidadAMover < original.getCantidad()) {
                original.setCantidad(original.getCantidad() - cantidadAMover);
                service.guardar(original);
            } else service.eliminar(id);
        } else {
            if (cantidadAMover < original.getCantidad()) {
                original.setCantidad(original.getCantidad() - cantidadAMover);
                service.guardar(original);
                Bandeja n = clonarParaMovimiento(original, cantidadAMover, u, username);
                n.setEnTelas(false);
                n.setUsuarioAsignador(username);
                service.guardar(n);
            } else {
                original.setUbicacion(u);
                original.setEnTelas(false);
                original.setUsuarioAsignador(username);
                service.guardar(original);
            }
        }

        registrarMovimiento(original.getCodigoLote(), nombrePlanta, "Semillero", u.getNombre(), cantidadAMover, username, "UBICACION");
        return ResponseEntity.ok().build();
    }

    /**
     * Traslada bandejas a zonas de tela.
     */
    @PutMapping("/{id}/mover-a-telas")
    public ResponseEntity<?> moverATelas(@PathVariable Long id, @RequestParam Long nuevaUbicacionId, @RequestParam Integer cantidadAMover, @RequestParam String username) {
        Bandeja original = service.buscarPorId(id);
        Ubicacion u = ubicacionRepository.findById(nuevaUbicacionId).orElseThrow(() -> new RuntimeException("Ubicación no encontrada"));

        Integer ocupadas = repository.sumCantidadByUbicacionId(nuevaUbicacionId);
        if ((ocupadas != null ? ocupadas : 0) + cantidadAMover > u.getCapacidadMax()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"message\": \"Sin espacio en la zona de Telas: " + u.getNombre() + "\"}");
        }

        String origenNombre = original.getUbicacion() != null ? original.getUbicacion().getNombre() : "Invernadero";
        String nombrePlanta = obtenerNombreVariedad(original);

        Optional<Bandeja> existencia = repository.findByCodigoLoteAndUbicacionIdAndVendidaFalse(original.getCodigoLote(), nuevaUbicacionId);

        if (existencia.isPresent()) {
            Bandeja ex = existencia.get();
            ex.setCantidad(ex.getCantidad() + cantidadAMover);
            acumularResponsableTraslado(ex, username);
            ex.setEnTelas(true);
            repository.save(ex);
            if (cantidadAMover < original.getCantidad()) {
                original.setCantidad(original.getCantidad() - cantidadAMover);
                service.guardar(original);
            } else service.eliminar(id);
        } else {
            if (cantidadAMover < original.getCantidad()) {
                original.setCantidad(original.getCantidad() - cantidadAMover);
                service.guardar(original);
                Bandeja n = clonarParaMovimiento(original, cantidadAMover, u, username);
                n.setEnTelas(true);
                n.setUsuarioTrasladador(username);
                service.guardar(n);
            } else {
                original.setEnTelas(true);
                original.setUbicacion(u);
                original.setUsuarioTrasladador(username);
                service.guardar(original);
            }
        }

        registrarMovimiento(original.getCodigoLote(), nombrePlanta, origenNombre, u.getNombre(), cantidadAMover, username, "TRASLADO");
        return ResponseEntity.ok().build();
    }

    /**
     * Proceso de venta total o parcial.
     */
    @Transactional
    @PatchMapping("/{id}/vender")
    public ResponseEntity<?> vender(@PathVariable Long id, @RequestParam String username, @RequestParam Integer cantidadAVender) {
        Bandeja b = service.buscarPorId(id);
        if (cantidadAVender > b.getCantidad()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"message\": \"Stock insuficiente\"}");

        String nombrePlanta = obtenerNombreVariedad(b);
        String origenNombre = b.getUbicacion() != null ? b.getUbicacion().getNombre() : "Telas";

        if (cantidadAVender < b.getCantidad()) {
            b.setCantidad(b.getCantidad() - cantidadAVender);
            service.guardar(b);
            Bandeja sold = clonarParaMovimiento(b, cantidadAVender, b.getUbicacion(), username);
            sold.setVendida(true);
            service.guardar(sold);
        } else {
            b.setVendida(true);
            service.guardar(b);
        }

        registrarMovimiento(b.getCodigoLote(), nombrePlanta, origenNombre, "CLIENTE", cantidadAVender, username, "VENTA");
        return ResponseEntity.ok().build();
    }

    /**
     * Borrado con log de auditoría.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, @RequestParam String username) {
        Bandeja b = service.buscarPorId(id);
        String nombrePlanta = obtenerNombreVariedad(b);
        String ubicacionNombre = b.getUbicacion() != null ? b.getUbicacion().getNombre() : "Semillero";

        registrarMovimiento(b.getCodigoLote(), nombrePlanta, ubicacionNombre, "ELIMINADO", b.getCantidad(), username, "BORRADO");

        service.eliminar(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/movimientos")
    public List<Movimiento> listarTodosLosMovimientos() {
        // CAMBIO: Antes decía "fecha", ahora usamos "id" para garantizar el orden de llegada real
        return movimientoRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    @GetMapping("/historial/{codigoLote}")
    public List<Movimiento> obtenerHistorialLote(@PathVariable String codigoLote) {
        return movimientoRepository.findByCodigoLoteOrderByFechaDesc(codigoLote);
    }

    // --- MÉTODOS PRIVADOS ---

    private String obtenerNombreVariedad(Bandeja b) {
        if (b.getVariedad() == null) return "Siembra";
        if (b.getVariedad().getNombre() != null) return b.getVariedad().getNombre();
        return variedadRepository.findById(b.getVariedad().getId()).map(Variedad::getNombre).orElse("Siembra");
    }

    private void registrarMovimiento(String lote, String variedad, String ori, String des, Integer cant, String user, String tipo) {
        Movimiento m = new Movimiento();
        m.setCodigoLote(lote); m.setVariedadNombre(variedad); m.setOrigen(ori);
        m.setDestino(des); m.setCantidad(cant); m.setUsuario(user); m.setTipo(tipo);
        movimientoRepository.save(m);
    }

    private void acumularResponsableAsignacion(Bandeja b, String user) {
        String actuales = b.getUsuarioAsignador();
        if (actuales == null || actuales.isEmpty()) b.setUsuarioAsignador(user);
        else if (!actuales.contains(user)) b.setUsuarioAsignador(actuales + ", " + user);
    }

    private void acumularResponsableTraslado(Bandeja b, String user) {
        String actuales = b.getUsuarioTrasladador();
        if (actuales == null || actuales.isEmpty()) b.setUsuarioTrasladador(user);
        else if (!actuales.contains(user)) b.setUsuarioTrasladador(actuales + ", " + user);
    }

    private Bandeja clonarParaMovimiento(Bandeja b, Integer cant, Ubicacion u, String user) {
        Bandeja n = new Bandeja();
        n.setVariedad(b.getVariedad()); n.setTipoBandeja(b.getTipoBandeja());
        n.setDuenio(b.getDuenio()); n.setCodigoLote(b.getCodigoLote());
        n.setFechaSiembra(b.getFechaSiembra()); n.setCantidad(cant);
        n.setUbicacion(u); n.setUsuarioCreador(b.getUsuarioCreador());
        n.setObservaciones(b.getObservaciones()); n.setFechaEstimadaSalida(b.getFechaEstimadaSalida());
        return n;
    }
}