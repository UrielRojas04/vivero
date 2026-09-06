package com.vivero.gestion.models;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "siembras")
@Data
public class Siembra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "variedad_planta_id")
    private VariedadPlanta variedadPlanta;

    @ManyToOne
    @JoinColumn(name = "variedad_bandeja_id")
    private VariedadBandeja variedadBandeja;

    private LocalDate fechaEstimada;

    // Snapshot obligatorio del nombre del dueño -- "Jefe / Vivero propio" (siembra sin
    // cliente, para stock propio) o el nombre del cliente vinculado, copiado en el momento del
    // alta (NO es una referencia viva, mismo patrón que RegistroSemilla.descripcionSemilla/
    // nombreQuienTrajo). Cuando cliente != null, este texto siempre coincide con
    // cliente.getNombreRazonSocial() en el momento del alta.
    private String dueno;

    // Vínculo OPCIONAL a un Cliente real (pedido del dueño 2026-09-05: "ahora sí necesitamos
    // asociar la siembra a un cliente"). Null cuando el dueño es "Jefe / Vivero propio" -- esa
    // opción sigue existiendo y nunca requiere cliente.
    //
    // Vuelta atrás parcial (2026-09-05, mismo día): el modo "Cliente" del formulario había
    // quedado sin nombre libre, exigiendo un cliente real del catálogo. El dueño aclaró que acá
    // sólo hace falta el nombre para identificar a quién pertenece la siembra en el listado -- el
    // perfil de cliente de verdad se crea recién al momento de la venta, no antes. Vuelve a ser
    // el mismo patrón "buscar o escribir libre" que ya usan RegistroSemilla y VariedadPlanta: sin
    // coincidencia real, se guarda como nombre libre en `dueno`, con `cliente` en null.
    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    // Código de lote impreso por el proveedor en el sobre de semillas.
    // NO lleva restricción de unicidad: varias siembras pueden compartir el
    // mismo código de lote cuando de un sobre salen siembras para clientes distintos.
    private String codigoLote;

    // Número de siembra interno asignado por el vivero. Obligatorio en todos los
    // orígenes; la obligatoriedad se valida en el servicio, no aquí.
    private String numeroSiembra;

    // Fecha de ejecución de la siembra (día en que la semilla fue efectivamente
    // colocada en las bandejas). NO confundir con fechaEstimada, que es la fecha
    // estimada de entrega. Cuando la siembra se hizo en un solo día, ambos campos
    // guardan la misma fecha; fechaSiembraFin nunca queda nula si
    // fechaSiembraInicio tiene valor. La obligatoriedad y la normalización se
    // validan en el servicio, no aquí.
    private LocalDate fechaSiembraInicio;
    private LocalDate fechaSiembraFin;

    @Enumerated(EnumType.STRING)
    private TipoOrigenSiembra tipoOrigen;

    private Integer cantidad;

    @Enumerated(EnumType.STRING)
    private EstadoSiembra estado = EstadoSiembra.EN_PROCESO;

    // Vínculo opcional al RegistroSemilla del que salió esta siembra (sólo tiene sentido con
    // tipoOrigen = SOBRE). Un mismo RegistroSemilla puede vincularse a varias siembras -- no
    // hay restricción de unicidad, mismo criterio que codigoLote (change
    // trazabilidad-semillas-siembras, 2026-09-04).
    @ManyToOne
    @JoinColumn(name = "registro_semilla_id")
    private RegistroSemilla registroSemilla;

    // Nota libre opcional (pedido del dueño 2026-09-05): mismo campo que ya existe en
    // RegistroSemilla.observaciones, con el mismo propósito -- cualquier aclaración que no entra
    // en un campo estructurado (ej. "se usó sólo la mitad del sobre de 10kg"). No se interpreta
    // ni se usa para ningún cálculo, es puramente informativo.
    private String observaciones;
}
