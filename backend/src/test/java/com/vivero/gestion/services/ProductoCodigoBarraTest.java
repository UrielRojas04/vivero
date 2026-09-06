package com.vivero.gestion.services;

import com.vivero.gestion.controllers.ProductoController;
import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Grupo 6 de tasks.md de codigo-barras-herramientas — 10 casos, base real (sin mocks de DB),
 * PostgreSQL de desarrollo (localhost:5433/vivero_db, mismo patrón que
 * VentaServiceListarVentasAbonoTest / RendicionColegaControllerPermisoTest).
 *
 * Cada test crea sus propios productos con un código de barras único (prefijo UUID) para no
 * chocar con datos reales sembrados, y los borra en @AfterEach.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class ProductoCodigoBarraTest {

    @Autowired
    private ProductoService productoService;

    @Autowired
    private ProductoController productoController;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private final List<Long> productosCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        UnidadNegocioContextHolder.clear();
        SecurityContextHolder.clearContext();
        for (Long id : productosCreados) {
            productoRepository.findById(id).ifPresent(productoRepository::delete);
        }
        productosCreados.clear();
    }

    private Long herramientasId() {
        return unidadNegocioRepository.findByNombre("Herramientas")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Herramientas sembrada"))
                .getId();
    }

    private Long viveroId() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"))
                .getId();
    }

    private ProductoDTO dtoBase(String nombre) {
        ProductoDTO dto = new ProductoDTO();
        dto.setNombre(nombre);
        dto.setDescripcion("Producto de test — " + nombre);
        dto.setPrecio(new BigDecimal("100.00"));
        dto.setStock(0);
        return dto;
    }

    private ProductoDTO crearEnUnidad(Long unidadId, String nombre, String codigoBarra) {
        UnidadNegocioContextHolder.setUnidadNegocioId(unidadId);
        ProductoDTO dto = dtoBase(nombre);
        dto.setCodigoBarra(codigoBarra);
        ProductoDTO creado = productoService.crearProducto(dto);
        productosCreados.add(creado.getId());
        return creado;
    }

    private String codigoUnico() {
        return "EAN-" + UUID.randomUUID().toString().substring(0, 8);
    }

    // 6.1 — crear producto con codigoBarra lo persiste y lo devuelve en el DTO.
    @Test
    void crearProductoConCodigoBarraLoPersisteYLoDevuelve() {
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        String codigo = codigoUnico();

        ProductoDTO creado = crearEnUnidad(herramientasId(), "Amoladora 6.1 " + codigo, codigo);

        assertThat(creado.getCodigoBarra()).isEqualTo(codigo);

        Producto enBase = productoRepository.findById(creado.getId()).orElseThrow();
        assertThat(enBase.getCodigoBarra()).isEqualTo(codigo);
    }

    // 6.2 — crear producto sin codigoBarra persiste null y no rompe nada existente.
    @Test
    void crearProductoSinCodigoBarraPersisteNull() {
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        ProductoDTO dto = dtoBase("Martillo 6.2 " + UUID.randomUUID());
        // codigoBarra deliberadamente no seteado (null).

        ProductoDTO creado = productoService.crearProducto(dto);
        productosCreados.add(creado.getId());

        assertThat(creado.getCodigoBarra()).isNull();
        assertThat(creado.getNombre()).isEqualTo(dto.getNombre());
        assertThat(creado.getPrecio()).isEqualByComparingTo(dto.getPrecio());
    }

    // 6.3 — normalización: espacios se recortan, sólo-espacios cae a null.
    @Test
    void normalizaCodigoBarraTrimYVacioANull() {
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        String base = codigoUnico();

        ProductoDTO conEspacios = dtoBase("Sierra 6.3a " + base);
        conEspacios.setCodigoBarra("  " + base + "  ");
        ProductoDTO creado1 = productoService.crearProducto(conEspacios);
        productosCreados.add(creado1.getId());
        assertThat(creado1.getCodigoBarra()).isEqualTo(base);

        ProductoDTO soloEspacios = dtoBase("Sierra 6.3b " + UUID.randomUUID());
        soloEspacios.setCodigoBarra("   ");
        ProductoDTO creado2 = productoService.crearProducto(soloEspacios);
        productosCreados.add(creado2.getId());
        assertThat(creado2.getCodigoBarra()).isNull();
    }

    // 6.4 — segundo producto con código ya usado en la misma unidad falla, mensaje nombra al
    // producto en conflicto.
    @Test
    void codigoDuplicadoEnMismaUnidadFallaConMensajeDelProductoEnConflicto() {
        String codigo = codigoUnico();
        ProductoDTO primero = crearEnUnidad(herramientasId(), "Taladro 6.4a " + codigo, codigo);

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        ProductoDTO segundo = dtoBase("Taladro 6.4b " + UUID.randomUUID());
        segundo.setCodigoBarra(codigo);

        assertThatThrownBy(() -> productoService.crearProducto(segundo))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(primero.getNombre());
    }

    // 6.5 — editar un producto que ya tiene código, sin cambiarlo, guarda bien (no conflicto
    // contra sí mismo).
    @Test
    void editarProductoSinCambiarSuPropioCodigoNoFalla() {
        String codigo = codigoUnico();
        ProductoDTO creado = crearEnUnidad(herramientasId(), "Pala 6.5 " + codigo, codigo);

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        ProductoDTO editar = dtoBase(creado.getNombre());
        editar.setCodigoBarra(codigo);
        editar.setPrecio(new BigDecimal("150.00"));

        ProductoDTO actualizado = assertDoesNotThrow(() -> productoService.actualizarProducto(creado.getId(), editar));
        assertThat(actualizado.getCodigoBarra()).isEqualTo(codigo);
        assertThat(actualizado.getPrecio()).isEqualByComparingTo("150.00");
    }

    // 6.6 — dos productos con codigoBarra null en la misma unidad conviven sin error.
    @Test
    void dosProductosConCodigoBarraNullConvivenSinError() {
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        ProductoDTO uno = dtoBase("Rastrillo 6.6a " + UUID.randomUUID());
        ProductoDTO dos = dtoBase("Rastrillo 6.6b " + UUID.randomUUID());

        ProductoDTO creado1 = assertDoesNotThrow(() -> productoService.crearProducto(uno));
        productosCreados.add(creado1.getId());
        ProductoDTO creado2 = assertDoesNotThrow(() -> productoService.crearProducto(dos));
        productosCreados.add(creado2.getId());

        assertThat(creado1.getCodigoBarra()).isNull();
        assertThat(creado2.getCodigoBarra()).isNull();
    }

    // 6.7 — código de un producto soft-deleted puede reutilizarse en un producto nuevo.
    @Test
    void codigoDeProductoSoftDeletedSePuedeReutilizar() {
        String codigo = codigoUnico();
        ProductoDTO original = crearEnUnidad(herramientasId(), "Pico 6.7 " + codigo, codigo);

        productoRepository.deleteById(original.getId()); // soft delete (@SQLDelete)
        productosCreados.remove(original.getId()); // ya no hace falta limpiarlo aparte

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        ProductoDTO nuevo = dtoBase("Pico 6.7-nuevo " + UUID.randomUUID());
        nuevo.setCodigoBarra(codigo);

        ProductoDTO creado = assertDoesNotThrow(() -> productoService.crearProducto(nuevo));
        productosCreados.add(creado.getId());
        assertThat(creado.getCodigoBarra()).isEqualTo(codigo);
    }

    // 6.8 — el mismo código en dos unidades de negocio distintas es aceptado.
    @Test
    void mismoCodigoEnDosUnidadesDistintasEsAceptado() {
        String codigo = codigoUnico();
        ProductoDTO enHerramientas = crearEnUnidad(herramientasId(), "Regadera 6.8h " + codigo, codigo);
        ProductoDTO enVivero = crearEnUnidad(viveroId(), "Regadera 6.8v " + codigo, codigo);

        assertThat(enHerramientas.getCodigoBarra()).isEqualTo(codigo);
        assertThat(enVivero.getCodigoBarra()).isEqualTo(codigo);
    }

    // 6.9 — GET /api/productos/codigo-barra/{codigo}: 200 con el producto correcto, 404 con
    // código inexistente, 404 con código de otra unidad.
    @Test
    void endpointDevuelve200Encontrado404NoExiste404OtraUnidad() {
        autenticarCon("LEER_STOCK");
        String codigo = codigoUnico();
        ProductoDTO creado = crearEnUnidad(herramientasId(), "Cinta 6.9 " + codigo, codigo);

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        var respuestaOk = productoController.buscarPorCodigoBarra(codigo);
        assertThat(respuestaOk.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuestaOk.getBody()).isNotNull();
        assertThat(respuestaOk.getBody().getId()).isEqualTo(creado.getId());

        var respuestaNoExiste = productoController.buscarPorCodigoBarra("NO-EXISTE-" + UUID.randomUUID());
        assertThat(respuestaNoExiste.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        UnidadNegocioContextHolder.setUnidadNegocioId(viveroId());
        var respuestaOtraUnidad = productoController.buscarPorCodigoBarra(codigo);
        assertThat(respuestaOtraUnidad.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // 6.10 — el endpoint responde 403 a un usuario sin LEER_STOCK ni ESCRIBIR_PRODUCCION.
    @Test
    void endpointRechaza403SinPermiso() {
        autenticarCon("ESCRIBIR_VENTAS"); // permiso real, pero no habilitado para este endpoint
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());

        assertThatThrownBy(() -> productoController.buscarPorCodigoBarra(codigoUnico()))
                .isInstanceOf(AccessDeniedException.class);
    }

    private void autenticarCon(String... autoridades) {
        List<SimpleGrantedAuthority> authorities = List.of(autoridades).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null, authorities));
    }
}
