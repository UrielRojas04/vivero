package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.EntregaPendienteConfirmarRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteRechazoDTO;
import com.vivero.gestion.dto.EntregaPendienteRequestDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Grupo 11 de tasks.md de entregas-pendientes-confirmacion-vivero (Decisión 8 de design.md): cada
 * uno de los 7 endpoints exige su permiso explícito, verificado en el backend independientemente
 * de lo que muestre la interfaz. Mismo patrón que HistorialCobrosAbonoControllerPermisoTest /
 * VentaControllerObtenerPorIdPermisoTest: se llama al bean proxied directo (no HTTP), y con datos
 * inválidos se distingue "el gate de permiso rechazó" (AccessDeniedException) de "el gate pasó y
 * falló DESPUÉS, en el cuerpo del método" (cualquier otra RuntimeException) -- el `@PreAuthorize`
 * de Spring Security se resuelve ANTES que el cuerpo del método, vía el proxy AOP del bean.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class EntregaPendienteControllerPermisoTest {

    @Autowired
    private EntregaPendienteController controller;

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

    private Authentication authenticacionActual() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    // El gate de permiso pasó si NO se lanzó AccessDeniedException -- cualquier otra excepción
    // (entrega/venta no encontrada, unidad inválida, request vacío) es evidencia de que sí pasó,
    // porque significa que el método llegó a ejecutar su cuerpo.
    private void asumirQuePasoElGate(Runnable accion) {
        assertDoesNotThrow(() -> {
            try {
                accion.run();
            } catch (RuntimeException ex) {
                if (ex instanceof AccessDeniedException) {
                    throw ex;
                }
            }
        });
    }

    private EntregaPendienteRequestDTO requestVacio() {
        EntregaPendienteRequestDTO req = new EntregaPendienteRequestDTO();
        req.setDetalles(List.of());
        return req;
    }

    private EntregaPendienteConfirmarRequestDTO confirmarRequestVacio() {
        return new EntregaPendienteConfirmarRequestDTO();
    }

    // --- 11.2: registrar y listarMias exigen ESCRIBIR_ENTREGAS ---
    @Test
    void registrarSinEscribirEntregasRechaza() {
        autenticarCon("LEER_ENTREGAS");
        assertThatThrownBy(() -> controller.registrar(requestVacio(), authenticacionActual()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void registrarConEscribirEntregasPasaElGate() {
        autenticarCon("ESCRIBIR_ENTREGAS");
        asumirQuePasoElGate(() -> controller.registrar(requestVacio(), authenticacionActual()));
    }

    @Test
    void listarMiasSinEscribirEntregasRechaza() {
        autenticarCon("LEER_ENTREGAS");
        assertThatThrownBy(() -> controller.listarMias(0, 20, authenticacionActual()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void listarMiasConEscribirEntregasPasaElGate() {
        autenticarCon("ESCRIBIR_ENTREGAS");
        asumirQuePasoElGate(() -> controller.listarMias(0, 20, authenticacionActual()));
    }

    // --- 11.3: listar, obtenerPorId, obtenerFirma y rechazar exigen LEER_ENTREGAS ---
    @Test
    void listarSinLeerEntregasRechaza() {
        autenticarCon("ESCRIBIR_ENTREGAS");
        assertThatThrownBy(() -> controller.listar(0, 20, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void listarConLeerEntregasPasaElGate() {
        autenticarCon("LEER_ENTREGAS");
        asumirQuePasoElGate(() -> controller.listar(0, 20, null));
    }

    @Test
    void obtenerPorIdSinLeerEntregasRechaza() {
        autenticarCon("ESCRIBIR_ENTREGAS");
        assertThatThrownBy(() -> controller.obtenerPorId(Long.MAX_VALUE))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void obtenerPorIdConLeerEntregasPasaElGate() {
        autenticarCon("LEER_ENTREGAS");
        asumirQuePasoElGate(() -> controller.obtenerPorId(Long.MAX_VALUE));
    }

    @Test
    void obtenerFirmaSinLeerEntregasRechaza() {
        autenticarCon("ESCRIBIR_ENTREGAS");
        assertThatThrownBy(() -> controller.obtenerFirma(Long.MAX_VALUE))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void obtenerFirmaConLeerEntregasPasaElGate() {
        autenticarCon("LEER_ENTREGAS");
        asumirQuePasoElGate(() -> controller.obtenerFirma(Long.MAX_VALUE));
    }

    @Test
    void rechazarSinLeerEntregasRechaza() {
        autenticarCon("ESCRIBIR_ENTREGAS");
        assertThatThrownBy(() -> controller.rechazar(Long.MAX_VALUE, new EntregaPendienteRechazoDTO(), authenticacionActual()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void rechazarConLeerEntregasPasaElGate() {
        autenticarCon("LEER_ENTREGAS");
        asumirQuePasoElGate(() -> controller.rechazar(Long.MAX_VALUE, new EntregaPendienteRechazoDTO(), authenticacionActual()));
    }

    // --- 11.4: confirmar exige LEER_ENTREGAS Y ESCRIBIR_VENTAS ---
    @Test
    void confirmarConLeerEntregasPeroSinEscribirVentasRechaza() {
        autenticarCon("LEER_ENTREGAS");
        assertThatThrownBy(() -> controller.confirmar(Long.MAX_VALUE, confirmarRequestVacio(), authenticacionActual()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void confirmarConAmbosPermisosPasaElGate() {
        autenticarCon("LEER_ENTREGAS", "ESCRIBIR_VENTAS");
        asumirQuePasoElGate(() -> controller.confirmar(Long.MAX_VALUE, confirmarRequestVacio(), authenticacionActual()));
    }

    // --- 11.5: un usuario con SÓLO ESCRIBIR_ENTREGAS no puede resolver ninguna entrega
    // (escenario "El empleado no puede resolver una entrega") ---
    @Test
    void unUsuarioConSoloEscribirEntregasNoPuedeConfirmarNiRechazarNiVerLaFirma() {
        autenticarCon("ESCRIBIR_ENTREGAS");

        assertThatThrownBy(() -> controller.confirmar(Long.MAX_VALUE, confirmarRequestVacio(), authenticacionActual()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.rechazar(Long.MAX_VALUE, new EntregaPendienteRechazoDTO(), authenticacionActual()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.obtenerFirma(Long.MAX_VALUE))
                .isInstanceOf(AccessDeniedException.class);
    }

    // --- 11.6: ningún endpoint del controller quedó sin @PreAuthorize (antecedente: DevolucionController) ---
    @Test
    void ningunEndpointPublicoQuedaSinPreAuthorize() {
        Method[] metodosDelControlador = EntregaPendienteController.class.getDeclaredMethods();
        long metodosPublicos = 0;
        for (Method m : metodosDelControlador) {
            if (!java.lang.reflect.Modifier.isPublic(m.getModifiers())) {
                continue;
            }
            metodosPublicos++;
            assertThat(m.isAnnotationPresent(PreAuthorize.class))
                    .as("El endpoint %s de EntregaPendienteController no tiene @PreAuthorize", m.getName())
                    .isTrue();
        }
        assertThat(metodosPublicos).isEqualTo(7); // los 7 endpoints del contrato HTTP (Decisión 13)
    }
}
