package com.vivero.gestion.services;

import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.ProveedorRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.services.impl.ProductoServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Tests de ProductoServiceImpl.actualizarIvaEnvioSiDistinto (reapertura puntual de la Decisión 6,
// sólo IVA/envío — pedido explícito del usuario, sesión del 2026-08-25, fuera de OpenSpec). Sin
// JPA real: ProductoRepository va mockeado con Mockito (spring-boot-starter-test ya lo trae), no
// hay acceso a base de datos real involucrado en este método — es lógica pura sobre el objeto
// Producto/UnidadNegocio ya cargado, mismo criterio que CosteoPorCapasCalculatorTest usa para
// CostoCalculator. La regla dura "tests sin mocks de DB" aplica a tests que EJERCITAN una consulta
// real; acá no se ejecuta ninguna consulta, sólo se verifica si se llamó o no productoRepository.save().
class ProductoServiceIvaEnvioPactadoTest {

    private ProductoServiceImpl productoService;
    private ProductoRepository productoRepository;

    @BeforeEach
    void setUp() {
        productoRepository = Mockito.mock(ProductoRepository.class);
        UnidadNegocioRepository unidadNegocioRepository = Mockito.mock(UnidadNegocioRepository.class);
        SseService sseService = Mockito.mock(SseService.class);
        MovimientoStockService movimientoStockService = Mockito.mock(MovimientoStockService.class);
        UsuarioRepository usuarioRepository = Mockito.mock(UsuarioRepository.class);
        ProveedorRepository proveedorRepository = Mockito.mock(ProveedorRepository.class);
        productoService = new ProductoServiceImpl(productoRepository, unidadNegocioRepository, sseService,
                movimientoStockService, usuarioRepository, proveedorRepository);
    }

    private static UnidadNegocio unidad(String ivaDefault, String envioDefault) {
        UnidadNegocio u = new UnidadNegocio();
        u.setIvaPorcentaje(new BigDecimal(ivaDefault));
        u.setCostoEnvioPorcentaje(new BigDecimal(envioDefault));
        return u;
    }

    // (a) Pactado igual al efectivo con el que se precargó la línea -> no toca la ficha.
    @Test
    void pactadoIgualAlEfectivo_noTocaLaFicha() {
        Producto producto = new Producto();
        producto.setIvaPorcentaje(new BigDecimal("21.00"));
        producto.setCostoEnvioPorcentaje(new BigDecimal("5.00"));
        producto.setUnidadNegocio(unidad("0.00", "0.00"));

        boolean cambio = productoService.actualizarIvaEnvioSiDistinto(
                producto, new BigDecimal("21"), new BigDecimal("5"));

        assertFalse(cambio);
        assertEquals(new BigDecimal("21.00"), producto.getIvaPorcentaje());
        assertEquals(new BigDecimal("5.00"), producto.getCostoEnvioPorcentaje());
        Mockito.verify(productoRepository, Mockito.never()).save(Mockito.any());
    }

    // (b1) Pactado distinto, SUBE respecto al efectivo actual -> se persiste (sube, sin ratchet).
    @Test
    void pactadoDistinto_subeYPersiste() {
        Producto producto = new Producto();
        producto.setIvaPorcentaje(new BigDecimal("10.00"));
        producto.setCostoEnvioPorcentaje(new BigDecimal("2.00"));
        producto.setUnidadNegocio(unidad("0.00", "0.00"));

        boolean cambio = productoService.actualizarIvaEnvioSiDistinto(
                producto, new BigDecimal("21"), new BigDecimal("8"));

        assertTrue(cambio);
        assertEquals(new BigDecimal("21"), producto.getIvaPorcentaje());
        assertEquals(new BigDecimal("8"), producto.getCostoEnvioPorcentaje());
        Mockito.verify(productoRepository, Mockito.times(1)).save(producto);
    }

    // (b2) Triangulación: pactado distinto, BAJA respecto al efectivo actual -> también se
    // persiste (a diferencia de ajustarCostoSiSuperaAlActual, acá no hay ratchet "sólo sube").
    @Test
    void pactadoDistinto_bajaYPersiste() {
        Producto producto = new Producto();
        producto.setIvaPorcentaje(new BigDecimal("21.00"));
        producto.setCostoEnvioPorcentaje(new BigDecimal("10.00"));
        producto.setUnidadNegocio(unidad("0.00", "0.00"));

        boolean cambio = productoService.actualizarIvaEnvioSiDistinto(
                producto, new BigDecimal("0"), new BigDecimal("3"));

        assertTrue(cambio);
        assertEquals(new BigDecimal("0"), producto.getIvaPorcentaje());
        assertEquals(new BigDecimal("3"), producto.getCostoEnvioPorcentaje());
        Mockito.verify(productoRepository, Mockito.times(1)).save(producto);
    }

    // Caso "hereda de la unidad" (producto.ivaPorcentaje == null): si el pactado llega igual al
    // default efectivo de la unidad, la ficha debe seguir en null (no se convierte en un valor
    // fijo propio que dejaría de seguir a la unidad si su default cambia mañana).
    @Test
    void productoQueHereda_pactadoIgualAlDefaultDeLaUnidad_siguenEnNull() {
        Producto producto = new Producto();
        producto.setIvaPorcentaje(null);
        producto.setCostoEnvioPorcentaje(null);
        producto.setUnidadNegocio(unidad("21.00", "5.00"));

        boolean cambio = productoService.actualizarIvaEnvioSiDistinto(
                producto, new BigDecimal("21"), new BigDecimal("5"));

        assertFalse(cambio);
        assertNull(producto.getIvaPorcentaje());
        assertNull(producto.getCostoEnvioPorcentaje());
        Mockito.verify(productoRepository, Mockito.never()).save(Mockito.any());
    }

    // Campos independientes: si sólo envío viene pactado (iva llega null, línea de un pedido
    // creado antes de esta funcionalidad), sólo se evalúa/toca envío.
    @Test
    void soloEnvioPactado_noTocaIva() {
        Producto producto = new Producto();
        producto.setIvaPorcentaje(new BigDecimal("21.00"));
        producto.setCostoEnvioPorcentaje(new BigDecimal("2.00"));
        producto.setUnidadNegocio(unidad("0.00", "0.00"));

        boolean cambio = productoService.actualizarIvaEnvioSiDistinto(producto, null, new BigDecimal("9"));

        assertTrue(cambio);
        assertEquals(new BigDecimal("21.00"), producto.getIvaPorcentaje());
        assertEquals(new BigDecimal("9"), producto.getCostoEnvioPorcentaje());
        Mockito.verify(productoRepository, Mockito.times(1)).save(producto);
    }

    // Ambos null (pedido creado antes de esta funcionalidad, línea de producto existente que
    // nunca trajo pactado) -> no-op total, la ficha ni se toca ni se guarda.
    @Test
    void ambosNull_esNoOpTotal() {
        Producto producto = new Producto();
        producto.setIvaPorcentaje(new BigDecimal("21.00"));
        producto.setCostoEnvioPorcentaje(new BigDecimal("2.00"));
        producto.setUnidadNegocio(unidad("0.00", "0.00"));

        boolean cambio = productoService.actualizarIvaEnvioSiDistinto(producto, null, null);

        assertFalse(cambio);
        Mockito.verify(productoRepository, Mockito.never()).save(Mockito.any());
    }
}
