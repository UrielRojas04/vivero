package com.vivero.gestion.controllers;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Pedido del dueño (2026-09-03): un rol con SOLO la sección "Ventas" (ESCRIBIR_VENTAS) tenía,
 * hasta ahora, LEER_CLIENTES y LEER_STOCK empaquetados junto con ese permiso en el modal de roles
 * -- necesarios para que las barras de búsqueda de NuevaVenta.jsx funcionen (clientesApi.getAll()
 * / productosApi.getAll()), pero como efecto colateral eso también abría las secciones completas
 * de Clientes, Productos y Devolución de Bandejas en el menú (todas gateadas por esos mismos
 * permisos), algo que el dueño no quiere para un rol pensado sólo para vender.
 *
 * La sección "Ventas" del modal pasa a otorgar sólo ESCRIBIR_VENTAS. Para que la búsqueda dentro
 * de Ventas siga funcionando sin ese paquete, GET /api/clientes y GET /api/productos aceptan
 * también ESCRIBIR_VENTAS como autorización -- mismo criterio ya usado en ProductoController para
 * ESCRIBIR_PRODUCCION. Esto no cambia qué datos trae la respuesta (sigue siendo el DTO completo,
 * con saldo/costo incluidos) -- sólo decide quién puede llamarla. El dueño confirmó explícitamente
 * que no hace falta ocultar esos campos a nivel de datos por ahora.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class VentasBusquedaClientesYProductosTest {

    @Autowired
    private ClienteController clienteController;

    @Autowired
    private ProductoController productoController;

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    private void autenticarCon(String... autoridades) {
        List<SimpleGrantedAuthority> authorities = List.of(autoridades).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null, authorities));
    }

    @Test
    void getAllClientesPermiteUsuarioConSoloEscribirVentas() {
        autenticarCon("ESCRIBIR_VENTAS");

        assertDoesNotThrow(() -> clienteController.getAll());
    }

    @Test
    void obtenerTodosLosProductosPermiteUsuarioConSoloEscribirVentas() {
        autenticarCon("ESCRIBIR_VENTAS");

        assertDoesNotThrow(() -> productoController.obtenerTodosLosProductos());
    }

    @Test
    void getAllClientesSigueRechazandoUsuarioSinNingunPermisoRelevante() {
        // Triangulación: un permiso ajeno no debe alcanzar.
        autenticarCon("ESCRIBIR_PEDIDOS");

        assertThatThrownBy(() -> clienteController.getAll())
                .isInstanceOf(AccessDeniedException.class);
    }
}
