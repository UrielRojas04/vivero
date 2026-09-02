package com.vivero.gestion.services;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.models.Producto;
import java.math.BigDecimal;
import java.util.List;

public interface ProductoService {
    ProductoDTO crearProducto(ProductoDTO productoDTO);
    ProductoDTO obtenerProductoPorId(Long id);
    List<ProductoDTO> obtenerTodosLosProductos();
    ProductoDTO actualizarProducto(Long id, ProductoDTO productoDTO);
    void eliminarProducto(Long id);

    /**
     * Busca un producto por su código de barras de fábrica (codigo-barras-herramientas),
     * acotado a la unidad de negocio activa ({@link com.vivero.gestion.security.UnidadNegocioContextHolder})
     * y a los no borrados. Lanza {@link com.vivero.gestion.exceptions.ResourceNotFoundException}
     * cuando no hay coincidencia — el controller la traduce a 404.
     */
    ProductoDTO buscarPorCodigoBarra(String codigo);

    /**
     * Asigna (o reemplaza) el código de barras de un producto ya existente, reutilizando la misma
     * normalización/validación de unicidad que {@link #crearProducto} y {@link #actualizarProducto}
     * ({@code normalizarCodigoBarra}/{@code validarCodigoBarraUnico} internos de la implementación
     * — no se duplica esa lógica). Pensado para {@code PedidoServiceImpl.confirmarRecepcion}
     * (grupo 12 de codigo-barras-herramientas, extensión post-cierre): permite cargar el código
     * escaneado de una línea existente en el mismo momento en que se confirma la recepción, dentro
     * de la misma transacción que el ingreso de stock. Lanza {@link IllegalArgumentException} si el
     * código ya está en uso por otro producto de la misma unidad (la propia unidad se toma de
     * {@code producto.getUnidadNegocio()}, no del contexto del hilo).
     */
    void asignarCodigoBarra(Long productoId, String codigoBarra);

    /**
     * Libera un código de barras, dejando en {@code null} el {@code codigoBarra} de quien lo
     * tenga hoy (grupo 13 de codigo-barras-herramientas, extensión post-cierre: aviso de código
     * duplicado al escanear). Busca en la unidad de negocio ACTIVA
     * ({@link com.vivero.gestion.security.UnidadNegocioContextHolder}), sobre los no borrados —
     * mismo alcance que {@link #buscarPorCodigoBarra}. Reutiliza la normalización interna
     * ({@code normalizarCodigoBarra}) sin duplicarla.
     *
     * <p>IDEMPOTENTE: si nadie tiene ese código en la unidad activa, no hace nada — no es un
     * error, es un "liberar si hace falta". No sabe (ni le importa) quién va a quedarse con el
     * código después; esa asignación real pasa por el flujo normal de
     * {@link #crearProducto}/{@link #actualizarProducto}/{@link #asignarCodigoBarra}, que ya
     * validan unicidad — al quedar el código libre, esos flujos no van a chocar.
     */
    void liberarCodigoBarra(String codigoBarra);

    /**
     * Unificación de los tres mecanismos puntuales que existían por separado desde el 2026-08-25
     * ({@code ajustarCostoSiSuperaAlActual}, {@code actualizarIvaEnvioSiDistinto},
     * {@code actualizarDescuentosSiDistinto} — todos eliminados por este método) — fix de un bug
     * real reportado por el dueño del negocio (2026-08-26): el ratchet de costo comparaba SÓLO el
     * costo BASE, mientras que IVA/envío/descuento se actualizaban sin esa misma protección, así
     * que la combinación de ambos mecanismos podía terminar bajando el costo FINAL real de la
     * ficha (ejemplo exacto: base $1.000 + descuento 10% = final $900; pedido nuevo base $1.500 +
     * descuento pactado 70% = final $450, MENOR — el sistema igual subía costoProducto a $1.500 y
     * el descuento a 70% porque cada pieza se comparaba por separado).
     *
     * <p>Ahora se compara el costo FINAL completo (base → descuentos en cascada → IVA → envío, vía
     * {@link com.vivero.gestion.services.CostoCalculator}) de la compra pactada contra el costo
     * FINAL completo actual de la ficha (con el IVA/envío EFECTIVO — fallback a la unidad de
     * negocio — y la cascada real de {@code producto.getDescuentos()}). Sólo si el final pactado es
     * ESTRICTAMENTE MAYOR al final actual se aplican los cuatro campos JUNTOS —
     * {@code costoProducto}, descuentos, {@code ivaPorcentaje}, {@code costoEnvioPorcentaje} — y se
     * recalcula {@code precio} una sola vez. Si no es estrictamente mayor, no se toca NADA de la
     * ficha: todo o nada, nunca parcial. Persiste el producto sólo si hubo cambio. No genera
     * movimientos de stock ni toca {@code producto.stock}.
     *
     * <p>IMPORTANTE: {@code costoBasePactado} debe ser el costo BASE del movimiento de ingreso
     * (p.ej. {@code MovimientoStock.getCostoBase()}), NUNCA {@code CapaCostoStock.getCostoUnitario()}
     * — ese último ya tiene descuentos/IVA/envío aplicados, y pasarlo acá duplicaría el conteo.
     *
     * <p>Nulls: {@code costoBasePactado == null} es no-op total (no hay compra que evaluar). Un
     * {@code null} en {@code ivaPactado}/{@code envioPactado}/{@code descuentoPactadoPorcentaje}
     * (líneas de pedidos viejos, de antes de que el campo existiera) usa el valor
     * EFECTIVO/actual de la ficha para ESE campo puntual al calcular el "final pactado" — y ese
     * mismo campo, si el final pactado termina superando al actual, NO se escribe en la ficha
     * (queda como estaba, incluido un {@code null} que "hereda" de la unidad de negocio, que de lo
     * contrario se convertiría silenciosamente en un valor fijo propio). El desglose de descuentos
     * pactados que sí se escribe reconstruye los nombres reales de cada descuento parseando
     * {@code descuentoPactadoDetalle} (formato {@code "Nombre XX.XX%; Nombre2 YY.YY%"}, el mismo
     * que ya arma el frontend) en vez de colapsar todo a una única entrada sintética
     * {@code "Proveedor"} (segundo bug reportado el mismo día: se perdían los nombres reales de
     * cada descuento). Si {@code descuentoPactadoDetalle} viene vacío/null, la ficha queda con la
     * lista de descuentos vacía (no se inventa ninguna entrada sintética).
     *
     * @return true si se modificó la ficha, false si no hizo falta.
     */
    boolean actualizarFichaSiCostoFinalSupera(Producto producto, BigDecimal costoBasePactado,
                                               BigDecimal ivaPactado, BigDecimal envioPactado,
                                               BigDecimal descuentoPactadoPorcentaje,
                                               String descuentoPactadoDetalle);
}
