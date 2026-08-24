package com.vivero.gestion.services;

import com.vivero.gestion.models.CapaCostoStock;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * TEMPORAL — tasks.md, tareas 7.1 a 7.6 (grupo 7, PUERTA 3, checkpoint de migración).
 *
 * <p>Replay EN SECO del libro real de {@code movimientos_stock} de Herramientas
 * ({@code unidad_negocio_id = 2}), usando el motor real {@link CosteoPorCapasCalculator}
 * (grupo 5, ya verde) sobre datos leídos por JDBC de sólo lectura. NO usa
 * {@code CapaCostoStockRepository.save(...)} en ningún punto, NO abre una transacción de
 * escritura, y NO persiste ninguna {@link CapaCostoStock}: las capas viven enteramente en
 * memoria de este test.
 *
 * <p>No forma parte del set de tests permanente del change (no está listado en el grupo 5 ni en
 * ningún otro grupo de tasks.md): es la herramienta puntual del checkpoint de la tarea 7.1-7.6,
 * pensada para borrarse una vez que el orquestador/usuario revisó su salida (tarea 7.7).
 */
class ReplayEnSecoHerramientasTest {

    private static final String URL = System.getenv().getOrDefault("DB_URL_TEST",
            "jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC");
    private static final String USER = System.getenv().getOrDefault("DB_USER", "admin");
    private static final String PASS = System.getenv().getOrDefault("DB_PASS", "root");

    private static class Movimiento {
        long id;
        Integer cantidad;
        BigDecimal costoUnitario;
        LocalDateTime fecha;
        String tipo;
    }

    @Test
    void replayEnSeco_reconstruyeCapasDeHerramientas_sinEscribirNada() throws Exception {
        try (Connection conn = DriverManager.getConnection(URL, USER, PASS)) {
            conn.setReadOnly(true); // Defensa extra: la conexión rechaza cualquier escritura.

            // 1) Productos vivos de Herramientas (unidad_negocio_id = 2, no soft-deleted).
            Map<Long, String> productos = new LinkedHashMap<>();
            Map<Long, Integer> stockActual = new LinkedHashMap<>();
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT id, nombre, stock FROM productos " +
                    "WHERE unidad_negocio_id = 2 AND (deleted = false OR deleted IS NULL) " +
                    "ORDER BY id");
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    long id = rs.getLong("id");
                    productos.put(id, rs.getString("nombre"));
                    stockActual.put(id, rs.getInt("stock"));
                }
            }

            System.out.println("=== REPLAY EN SECO — Herramientas (" + productos.size() + " productos vivos) ===");
            System.out.println("(sólo lectura — nada de esto se persiste)\n");

            int totalProductos = 0;
            int totalReconcilian = 0;
            List<String> noReconcilian = new ArrayList<>();

            for (Map.Entry<Long, String> pe : productos.entrySet()) {
                long productoId = pe.getKey();
                String nombre = pe.getValue();
                int stock = stockActual.get(productoId);
                totalProductos++;

                // 2) Movimientos del producto, orden (fecha ASC, id ASC) — mismo orden que exige
                // la tarea 7.1 y que usa CosteoPorCapasCalculator.descontar(...) internamente.
                List<Movimiento> movimientos = new ArrayList<>();
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT id, cantidad, costo_unitario, fecha, tipo_movimiento " +
                        "FROM movimientos_stock " +
                        "WHERE producto_id = ? AND deleted = false " +
                        "ORDER BY fecha ASC, id ASC")) {
                    ps.setLong(1, productoId);
                    try (ResultSet rs = ps.executeQuery()) {
                        while (rs.next()) {
                            Movimiento m = new Movimiento();
                            m.id = rs.getLong("id");
                            int cant = rs.getInt("cantidad");
                            m.cantidad = rs.wasNull() ? null : cant;
                            m.costoUnitario = rs.getBigDecimal("costo_unitario");
                            m.fecha = rs.getTimestamp("fecha").toLocalDateTime();
                            m.tipo = rs.getString("tipo_movimiento");
                            movimientos.add(m);
                        }
                    }
                }

                // 1.5(c): sin dos movimientos con la misma fecha dentro del mismo producto.
                for (int i = 1; i < movimientos.size(); i++) {
                    if (movimientos.get(i).fecha.equals(movimientos.get(i - 1).fecha)) {
                        System.out.println("  !! ADVERTENCIA: fecha empatada en producto " + productoId +
                                " entre mov " + movimientos.get(i - 1).id + " y " + movimientos.get(i).id +
                                " (desempatado por id ASC, igual que el motor real)");
                    }
                }

                // 3) Replay: capas en memoria. Entrante con cantidad>0 => nueva capa. Saliente =>
                // CosteoPorCapasCalculator.descontar(...) real (NO reimplementado).
                List<CapaCostoStock> capas = new ArrayList<>();
                boolean saldoNegativoDetectado = false;
                for (Movimiento m : movimientos) {
                    boolean entrante = "INGRESO".equals(m.tipo) || "AJUSTE_INICIAL".equals(m.tipo);
                    boolean saliente = "VENTA".equals(m.tipo) || "EGRESO".equals(m.tipo) || "MERMA".equals(m.tipo);

                    if (entrante) {
                        if (m.cantidad != null && m.cantidad > 0) {
                            CapaCostoStock capa = new CapaCostoStock();
                            capa.setId(m.id); // id del MOVIMIENTO de origen, sólo para desempate/trazabilidad en este replay.
                            capa.setCantidadOriginal(m.cantidad);
                            capa.setCantidadRestante(m.cantidad);
                            capa.setCostoUnitario(m.costoUnitario);
                            capa.setFecha(m.fecha);
                            capas.add(capa);
                        }
                        // cantidad == 0 (o null): se ignora, no crea capa (arreglo de costos fantasma, tarea 6.4/7.1).
                    } else if (saliente) {
                        if (m.cantidad != null && m.cantidad > 0) {
                            try {
                                CosteoPorCapasCalculator.descontar(capas, m.cantidad);
                            } catch (IllegalStateException e) {
                                saldoNegativoDetectado = true;
                                System.out.println("  !! producto " + productoId + ": saldo insuficiente en mov " +
                                        m.id + " (" + m.tipo + " x" + m.cantidad + "): " + e.getMessage());
                            }
                        }
                    } else {
                        System.out.println("  !! tipo_movimiento inesperado: " + m.tipo + " (mov " + m.id + ")");
                    }
                }

                // 4) Reconciliación: Σ cantidadRestante == producto.stock (tarea 7.3).
                int sumaCapas = capas.stream().mapToInt(CapaCostoStock::getCantidadRestante).sum();
                boolean reconcilia = !saldoNegativoDetectado && sumaCapas == stock;
                if (reconcilia) {
                    totalReconcilian++;
                } else {
                    noReconcilian.add("id=" + productoId + " " + nombre);
                }

                CapaCostoStock referencia = CosteoPorCapasCalculator.capaDeReferencia(capas);

                System.out.println("--- id=" + productoId + " " + nombre + " ---");
                System.out.println("  stock actual (Producto.stock): " + stock);
                if (capas.isEmpty()) {
                    System.out.println("  capas activas: ninguna");
                } else {
                    for (CapaCostoStock c : capas) {
                        if (c.getCantidadRestante() > 0) {
                            System.out.println("  capa: " + c.getCantidadRestante() + " u. @ $" + c.getCostoUnitario() +
                                    "  (fecha=" + c.getFecha() + ", mov. origen=" + c.getId() + ")");
                        }
                    }
                }
                System.out.println("  Σ cantidadRestante = " + sumaCapas + (reconcilia ? "  == stock (OK)" : "  != stock (!!)"));
                System.out.println("  costo de referencia NUEVO (máximo activo): " +
                        (referencia == null ? "sin capas — cae al criterio de hoy" : "$" + referencia.getCostoUnitario()));
                System.out.println();
            }

            System.out.println("=== RESUMEN ===");
            System.out.println("Productos: " + totalProductos + " | reconcilian: " + totalReconcilian +
                    " | NO reconcilian: " + noReconcilian.size());
            if (!noReconcilian.isEmpty()) {
                System.out.println("No reconcilian: " + noReconcilian);
            }
        }
    }
}
