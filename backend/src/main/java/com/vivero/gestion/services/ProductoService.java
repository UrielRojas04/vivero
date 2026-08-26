package com.vivero.gestion.services;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.dto.RevisionCostoProductoDTO;
import com.vivero.gestion.models.Producto;
import java.math.BigDecimal;
import java.util.List;

public interface ProductoService {
    ProductoDTO crearProducto(ProductoDTO productoDTO);
    ProductoDTO obtenerProductoPorId(Long id);
    List<ProductoDTO> obtenerTodosLosProductos();
    ProductoDTO actualizarProducto(Long id, ProductoDTO productoDTO);
    void eliminarProducto(Long id);

    // Panel de revisión de costos (grupo 3 de tasks.md de revision-costos-productos). Sólo
    // lectura: arma el DTO de cada fila reusando CostoCalculator, sin lógica de negocio nueva
    // sobre el costo (tarea 3.4).
    List<RevisionCostoProductoDTO> listarRevisionCostos();

    /**
     * Auto-ajuste de costoProducto/precio "sólo hacia arriba" (pedido puntual del usuario,
     * 2026-08-25, sobre costeo-fifo-herramientas): cuando el costo BASE (pre-descuentos/IVA/envío,
     * el mismo tipo de número que {@code Producto.costoProducto}) de una capa recién creada supera
     * el {@code costoProducto} actual de la ficha (o cuando {@code costoProducto} es {@code null}),
     * sube {@code costoProducto} a ese valor y recalcula {@code precio} reusando
     * {@code calcularPrecioSiAplica()} — nunca duplica la fórmula. Si el costo base de la capa nueva
     * es menor o igual, no toca nada: {@code costoProducto}/{@code precio} nunca bajan solos por
     * esta vía (eso queda para que el usuario los edite a mano). Persiste el producto si hubo
     * cambio. No genera movimientos de stock ni toca {@code producto.stock}.
     *
     * <p>IMPORTANTE: {@code costoBaseNuevo} debe ser el costo BASE del movimiento de ingreso
     * (p.ej. {@code MovimientoStock.getCostoBase()}), NUNCA {@code CapaCostoStock.getCostoUnitario()}
     * — ese último ya tiene descuentos/IVA/envío aplicados (viene de {@code CostoCalculator}), y
     * pasarlo acá haría que {@code calcularPrecioSiAplica()} le vuelva a aplicar la fórmula completa
     * una segunda vez (doble conteo de envío/IVA).
     *
     * @return true si se ajustó costoProducto/precio, false si no hizo falta.
     */
    boolean ajustarCostoSiSuperaAlActual(Producto producto, BigDecimal costoBaseNuevo);

    /**
     * Reapertura puntual de la Decisión 6 de herramientas-pedidos-proveedores, sólo para IVA/envío
     * (pedido explícito del usuario, sesión del 2026-08-25 — no es un change de OpenSpec): al
     * confirmar la recepción de un pedido con un producto YA EXISTENTE, el IVA%/envío% pactados en
     * la línea (antes de sólo lectura, ahora editables) se guardan como el nuevo valor por defecto
     * de la ficha del producto — a diferencia de {@link #ajustarCostoSiSuperaAlActual}, ACÁ no hay
     * ratchet: el valor persiste tanto si sube como si baja, porque es una corrección real del
     * dato, no una medida de seguridad.
     *
     * <p>Guard central (evita romper "hereda de la unidad" — null): sólo escribe
     * {@code producto.ivaPorcentaje}/{@code producto.costoEnvioPorcentaje} cuando el valor pactado
     * es numéricamente DISTINTO del valor EFECTIVO actual de la ficha (el que resultaría de
     * {@code CostoCalculator.resolverEfectivo(producto.getIvaPorcentaje(), unidad.getIvaPorcentaje())},
     * y análogo para envío). Si el pactado llega igual al efectivo (el usuario no tocó el campo
     * precargado), la ficha queda intacta — incluido un {@code null} que "hereda" de la unidad,
     * que de lo contrario se convertiría silenciosamente en un valor fijo propio.
     *
     * <p>Cada parámetro es independiente: un {@code null} en {@code ivaPactadoPorcentaje} o
     * {@code envioPactadoPorcentaje} dice "no vino pactado para este campo" (línea de un pedido
     * creado antes de esta funcionalidad) y ese campo de la ficha no se toca.
     *
     * @return true si se modificó algún campo de la ficha, false si no hizo falta.
     */
    boolean actualizarIvaEnvioSiDistinto(Producto producto, BigDecimal ivaPactadoPorcentaje, BigDecimal envioPactadoPorcentaje);

    /**
     * Ampliación del change {@code pedido-planilla-editable} (pedido explícito del dueño del
     * negocio, sesión del 2026-08-25 — no es un change nuevo de OpenSpec, extiende el mismo change
     * en curso): la columna "Descuentos" de una línea de producto YA EXISTENTE pasa de sólo
     * lectura a editable, mismo patrón exacto que {@link #actualizarIvaEnvioSiDistinto}. Al
     * confirmar la recepción, si el % pactado de la línea es numéricamente distinto del % efectivo
     * COLAPSADO actual de {@code producto.getDescuentos()} (misma cascada que
     * {@link com.vivero.gestion.services.CostoCalculator#calcular}), se reemplaza la ficha por una
     * ÚNICA entrada sintética {@code "Proveedor"} con el nuevo porcentaje — mismo criterio que ya
     * usa {@code PedidoServiceImpl.confirmarRecepcion()} al dar de alta un producto nuevo desde una
     * línea "pendiente" (no se guarda un desglose estructurado por nombre; ese desglose sólo
     * sobrevive como texto en {@code MovimientoStock.descuentoDetalle} de ESTE movimiento).
     *
     * <p>Igual que {@link #actualizarIvaEnvioSiDistinto}: se sobreescribe en cualquier dirección
     * (sube o baja), sin ratchet — es corrección de dato, no medida de seguridad.
     *
     * <p>{@code descuentoPactadoDetalle} no participa de la comparación ni de lo que se persiste
     * en la ficha (que siempre colapsa a la entrada sintética "Proveedor"); se recibe para que la
     * firma quede simétrica con el resto de los datos pactados de la línea.
     *
     * @return true si se modificó producto.descuentos, false si no hizo falta.
     */
    boolean actualizarDescuentosSiDistinto(Producto producto, BigDecimal descuentoPactadoPorcentaje, String descuentoPactadoDetalle);
}
