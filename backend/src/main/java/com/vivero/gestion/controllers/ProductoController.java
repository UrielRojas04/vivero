package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.exceptions.ResourceNotFoundException;
import com.vivero.gestion.services.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;

    @Autowired
    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<ProductoDTO> crearProducto(@RequestBody ProductoDTO dto) {
        ProductoDTO creado = productoService.crearProducto(dto);
        return new ResponseEntity<>(creado, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_PRODUCCION')")
    public ResponseEntity<ProductoDTO> obtenerProductoPorId(@PathVariable Long id) {
        ProductoDTO dto = productoService.obtenerProductoPorId(id);
        return ResponseEntity.ok(dto);
    }

    // Ampliado 2026-09-03 (pedido del dueño): ESCRIBIR_VENTAS también autoriza -- el buscador de
    // producto en NuevaVenta.jsx (productosApi.getAll()) lo necesita, ya que la sección "Ventas"
    // del modal de roles ya NO empaqueta LEER_STOCK (para que un rol de sólo Ventas no vea la
    // sección completa de Productos en el menú).
    // Ampliado de nuevo (change entregas-pendientes-confirmacion-vivero): se suma
    // ESCRIBIR_ENTREGAS -- mismo criterio, el buscador de producto en Entregas.jsx lo necesita
    // para un rol que sólo tiene la sección "Entregas" tildada.
    // Ampliado de nuevo (2026-09-09, pedido del dueño): se suma ESCRIBIR_BANDEJAS -- el buscador
    // de producto de RegistrarDevolucionProductoModal.jsx (dentro de la sección Devoluciones)
    // llama a este mismo endpoint (productosApi.getAll()) para elegir qué producto sobrante se
    // devuelve, y un rol de sólo Devoluciones lo necesita igual que Ventas/Producción/Entregas.
    @GetMapping
    @PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_PRODUCCION', 'ESCRIBIR_VENTAS', 'ESCRIBIR_ENTREGAS', 'ESCRIBIR_BANDEJAS')")
    public ResponseEntity<List<ProductoDTO>> obtenerTodosLosProductos() {
        List<ProductoDTO> dtos = productoService.obtenerTodosLosProductos();
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<ProductoDTO> actualizarProducto(@PathVariable Long id, @RequestBody ProductoDTO dto) {
        ProductoDTO actualizado = productoService.actualizarProducto(id, dto);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<Void> eliminarProducto(@PathVariable Long id) {
        productoService.eliminarProducto(id);
        return ResponseEntity.noContent().build();
    }

    // Búsqueda por código de barras de fábrica (codigo-barras-herramientas). Mismo criterio de
    // permiso que los otros GET del controller (Decisión 9 de design.md): quien ya puede ver el
    // catálogo puede buscarlo por código, no es un nivel de acceso nuevo.
    //
    // Traduce ResourceNotFoundException a 404 acá mismo, con try/catch, en vez de un
    // @ExceptionHandler local: un @ExceptionHandler de @RestController sólo intercepta cuando la
    // llamada pasa por el DispatcherServlet (MockMvc/HTTP real); los tests de este change
    // invocan el bean del controller directamente (mismo patrón que
    // RendicionColegaControllerPermisoTest, para poder aserter también sobre @PreAuthorize sin
    // levantar un servidor), y ese camino nunca pasa por el resolver de excepciones de MVC.
    // ResourceNotFoundException hoy cae, en el resto del código, al handler genérico de
    // GlobalExceptionHandler (500) — comportamiento preexistente que este change no toca; acá sí
    // importa (tarea 5.2: la respuesta es siempre ProductoDTO o 404, nunca 500 por "no
    // encontrado").
    @GetMapping("/codigo-barra/{codigo}")
    @PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_PRODUCCION')")
    public ResponseEntity<ProductoDTO> buscarPorCodigoBarra(@PathVariable String codigo) {
        try {
            ProductoDTO dto = productoService.buscarPorCodigoBarra(codigo);
            return ResponseEntity.ok(dto);
        } catch (ResourceNotFoundException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    // Grupo 13 (aviso de código duplicado al escanear, extensión post-cierre): libera un código
    // de barras de quien lo tenga hoy en la unidad activa, sin asignárselo a nadie todavía — la
    // asignación real pasa después por el guardado normal (crearProducto/actualizarProducto) o
    // por confirmarRecepcion. Mismo permiso que el resto de las escrituras de código de barras
    // (ESCRIBIR_STOCK, no LEER_STOCK como el GET de arriba). Idempotente: 204 tanto si liberó
    // algo como si nadie tenía ese código.
    @DeleteMapping("/codigo-barra/{codigo}")
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<Void> liberarCodigoBarra(@PathVariable String codigo) {
        productoService.liberarCodigoBarra(codigo);
        return ResponseEntity.noContent().build();
    }
}
