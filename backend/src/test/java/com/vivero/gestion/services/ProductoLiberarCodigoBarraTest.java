package com.vivero.gestion.services;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Grupo 13 de tasks.md de codigo-barras-herramientas (extensión post-cierre: aviso de código
 * duplicado al escanear) — tarea 13.3, base real (sin mocks de DB), mismo patrón que
 * ProductoCodigoBarraTest (grupo 6): PostgreSQL de desarrollo (localhost:5433/vivero_db).
 *
 * Cada test crea sus propios productos con un código de barras único (prefijo UUID) y los borra
 * en @AfterEach.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class ProductoLiberarCodigoBarraTest {

    @Autowired
    private ProductoService productoService;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private final List<Long> productosCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        UnidadNegocioContextHolder.clear();
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

    // 13.3(a) — liberar el código de un producto que lo tenía lo deja en null y no toca ningún
    // otro campo del producto.
    @Test
    void liberarCodigoDeProductoQueLoTeniaLoDejaEnNullSinTocarOtrosCampos() {
        String codigo = codigoUnico();
        ProductoDTO creado = crearEnUnidad(herramientasId(), "Amoladora 13.3a " + codigo, codigo);

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        productoService.liberarCodigoBarra(codigo);

        Producto enBase = productoRepository.findById(creado.getId()).orElseThrow();
        assertThat(enBase.getCodigoBarra()).isNull();
        assertThat(enBase.getNombre()).isEqualTo(creado.getNombre());
        assertThat(enBase.getDescripcion()).isEqualTo(creado.getDescripcion());
        assertThat(enBase.getPrecio()).isEqualByComparingTo(creado.getPrecio());
        assertThat(enBase.getStock()).isEqualTo(creado.getStock());
    }

    // 13.3(b) — liberar un código que nadie tiene no lanza error (idempotente).
    @Test
    void liberarCodigoQueNadieTieneNoLanzaError() {
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        String codigo = codigoUnico();

        assertDoesNotThrow(() -> productoService.liberarCodigoBarra(codigo));
    }

    // 13.3(c) — después de liberar, un crearProducto/actualizarProducto con ese mismo código en
    // OTRO producto ya no falla por duplicado (regresión positiva del flujo completo).
    @Test
    void tresLiberadoUnCodigoOtroProductoPuedeUsarloSinChocar() {
        String codigo = codigoUnico();
        ProductoDTO viejo = crearEnUnidad(herramientasId(), "Taladro 13.3c-viejo " + codigo, codigo);

        UnidadNegocioContextHolder.setUnidadNegocioId(herramientasId());
        productoService.liberarCodigoBarra(codigo);

        ProductoDTO nuevoDto = dtoBase("Taladro 13.3c-nuevo " + UUID.randomUUID());
        nuevoDto.setCodigoBarra(codigo);
        ProductoDTO nuevoCreado = assertDoesNotThrow(() -> productoService.crearProducto(nuevoDto));
        productosCreados.add(nuevoCreado.getId());

        assertThat(nuevoCreado.getCodigoBarra()).isEqualTo(codigo);

        Producto viejoEnBase = productoRepository.findById(viejo.getId()).orElseThrow();
        assertThat(viejoEnBase.getCodigoBarra()).isNull();
    }
}
