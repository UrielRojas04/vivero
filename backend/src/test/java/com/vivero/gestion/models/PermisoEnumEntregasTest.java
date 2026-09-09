package com.vivero.gestion.models;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Grupo 3 de tasks.md de entregas-pendientes-confirmacion-vivero (Decisión 8 de design.md): dos
 * permisos nuevos, LEER_ENTREGAS(22) y ESCRIBIR_ENTREGAS(23), agregados AL FINAL de PermisoEnum,
 * sin reordenar los existentes. Test unitario puro, sin Spring/DB: PermisoEnum es un enum simple.
 */
class PermisoEnumEntregasTest {

    @Test
    void losIdsNuevosMapeanALosPermisosDeEntregas() {
        assertThat(PermisoEnum.fromId(22L)).isEqualTo(PermisoEnum.LEER_ENTREGAS);
        assertThat(PermisoEnum.fromId(23L)).isEqualTo(PermisoEnum.ESCRIBIR_ENTREGAS);
    }

    @Test
    void losIds1a21SiguenMapeandoALosMismosPermisosQueAntes() {
        assertThat(PermisoEnum.fromId(1L)).isEqualTo(PermisoEnum.LEER_STOCK);
        assertThat(PermisoEnum.fromId(2L)).isEqualTo(PermisoEnum.ESCRIBIR_STOCK);
        assertThat(PermisoEnum.fromId(3L)).isEqualTo(PermisoEnum.ESCRIBIR_VENTAS);
        assertThat(PermisoEnum.fromId(4L)).isEqualTo(PermisoEnum.ADMIN_DB);
        assertThat(PermisoEnum.fromId(5L)).isEqualTo(PermisoEnum.LEER_CLIENTES);
        assertThat(PermisoEnum.fromId(6L)).isEqualTo(PermisoEnum.ESCRIBIR_CLIENTES);
        assertThat(PermisoEnum.fromId(7L)).isEqualTo(PermisoEnum.LEER_INSUMOS);
        assertThat(PermisoEnum.fromId(8L)).isEqualTo(PermisoEnum.ESCRIBIR_INSUMOS);
        assertThat(PermisoEnum.fromId(9L)).isEqualTo(PermisoEnum.LEER_FINANZAS);
        assertThat(PermisoEnum.fromId(10L)).isEqualTo(PermisoEnum.LEER_BANDEJAS);
        assertThat(PermisoEnum.fromId(11L)).isEqualTo(PermisoEnum.ESCRIBIR_BANDEJAS);
        assertThat(PermisoEnum.fromId(12L)).isEqualTo(PermisoEnum.LEER_PEDIDOS);
        assertThat(PermisoEnum.fromId(13L)).isEqualTo(PermisoEnum.ESCRIBIR_PEDIDOS);
        assertThat(PermisoEnum.fromId(14L)).isEqualTo(PermisoEnum.LEER_SIEMBRAS);
        assertThat(PermisoEnum.fromId(15L)).isEqualTo(PermisoEnum.ESCRIBIR_SIEMBRAS);
        assertThat(PermisoEnum.fromId(16L)).isEqualTo(PermisoEnum.ADMIN_SIEMBRAS);
        assertThat(PermisoEnum.fromId(17L)).isEqualTo(PermisoEnum.LEER_FACTURACION);
        assertThat(PermisoEnum.fromId(18L)).isEqualTo(PermisoEnum.ESCRIBIR_PRODUCCION);
        assertThat(PermisoEnum.fromId(19L)).isEqualTo(PermisoEnum.LEER_REGISTRO_SEMILLAS);
        assertThat(PermisoEnum.fromId(20L)).isEqualTo(PermisoEnum.ESCRIBIR_REGISTRO_SEMILLAS);
        assertThat(PermisoEnum.fromId(21L)).isEqualTo(PermisoEnum.LEER_CONFIGURACION);
    }
}
