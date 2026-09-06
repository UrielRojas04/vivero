package com.vivero.gestion.models;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
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

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

/**
 * Constancia digital de que un cliente trajo un sobre de semilla al vivero para que se la
 * germine. Es un libro de entradas, NO un circuito de producción: a diferencia de
 * {@link Siembra}, dar de alta un RegistroSemilla nunca crea {@link Producto} ni
 * {@link MovimientoStock} (Decisión 1 de
 * openspec/changes/registro-semillas-clientes/design.md). Si en el futuro se necesita
 * trazar "de este sobre salió esta siembra", se agrega una FK opcional
 * Siembra.registroSemillaId, sin tocar nada de esta entidad.
 */
@Entity
@Table(name = "registros_semillas")
@SQLDelete(sql = "UPDATE registros_semillas SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
@Data
public class RegistroSemilla {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate fechaRecepcion;

    // Código de lote impreso por el semillero en el sobre. Texto libre, formato totalmente
    // irregular (numérico, alfanumérico, con ceros a la izquierda). Sin restricción de
    // unicidad: el mismo lote puede repetirse entre entregas (Decisión 5, mismo precedente
    // que Siembra.codigoLote).
    private String lote;

    // Vínculo OPCIONAL a un Cliente existente. Si la persona no está en el sistema, este
    // campo queda null y sólo se persiste el nombre suelto en nombreQuienTrajo (Decisión 2).
    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    // Snapshot obligatorio del nombre de quien trajo la semilla. Cuando se vincula un
    // Cliente, se copia su nombreRazonSocial en el momento del alta -- no es una referencia
    // viva -- para que el registro histórico sobreviva al borrado lógico del cliente
    // (Decisión 2).
    private String nombreQuienTrajo;

    // Snapshot del teléfono, nullable. Mismo criterio que nombreQuienTrajo.
    private String telefonoContacto;

    // Snapshot obligatorio del nombre de la variedad (pedido del dueño 2026-09-04): cuando se
    // vincula una VariedadPlanta del catálogo, se copia su nombre acá en el momento del alta --
    // NO es una referencia viva -- mismo criterio exacto que nombreQuienTrajo/cliente. Si la
    // variedad no está en el catálogo, el usuario puede seguir escribiendo un nombre libre acá,
    // dejando variedadPlanta en null.
    private String descripcionSemilla;

    // Vínculo OPCIONAL a una VariedadPlanta del catálogo. Null cuando el usuario escribió un
    // nombre libre en vez de elegir del catálogo (Decisión del dueño: "buscar o escribir
    // libre", mismo patrón que el campo cliente/nombreQuienTrajo de más arriba).
    @ManyToOne
    @JoinColumn(name = "variedad_planta_id")
    private VariedadPlanta variedadPlanta;

    private BigDecimal cantidad;

    @Enumerated(EnumType.STRING)
    private UnidadCantidadSemilla unidadCantidad;

    // Sólo tiene sentido con unidadCantidad = SOBRES. El servicio lo normaliza a null en
    // cualquier otro caso (Decisión 4).
    private Integer contenidoPorSobre;

    // Qué representa contenidoPorSobre (pedido del dueño 2026-09-05): default SEMILLAS si no se
    // carga -- compatibilidad con todos los registros previos a este campo. Con GRAMOS, la
    // conversión a semillas totales necesita además VariedadPlanta.semillasPorGramo (ver
    // RegistroSemillaServiceImpl); sin ese dato el total simplemente no se calcula, igual que
    // GRAMOS directo sin variedad vinculada.
    @Enumerated(EnumType.STRING)
    private UnidadContenidoSobre contenidoPorSobreUnidad;

    // Tipo y cantidad de bandejas que se estima que van a salir de esta semilla (pedido del
    // dueño 2026-09-05), planificación al momento de recibirla -- no una siembra real todavía.
    // cantidadBandejas es una sugerencia editable (misma lógica que ya usa Siembra: totalSemillas
    // ÷ celdas de la bandeja, redondeado hacia abajo), nunca una validación; el usuario la puede
    // pisar a mano en cualquier momento.
    @ManyToOne
    @JoinColumn(name = "variedad_bandeja_id")
    private VariedadBandeja variedadBandeja;

    private Integer cantidadBandejas;

    private String observaciones;

    // Usuario del vivero que recibió el sobre -- equivalente digital de la columna "Firma"
    // del papel. Se resuelve en el controller desde el Authentication, nunca del body
    // (Decisión 6).
    @ManyToOne
    @JoinColumn(name = "usuario_recibe_id")
    private Usuario usuarioRecibe;

    private LocalDateTime fechaRegistro;

    // Fecha en la que el cliente pasa a buscar la planta lista (pedido del dueño 2026-09-05):
    // reemplaza a fechaRecepcion como dato que se le pide al dueño en el alta -- fechaRecepcion
    // sigue existiendo (se sigue guardando la fecha de hoy al crear el registro) pero ya no es
    // un campo que el usuario completa a mano. Opcional: junto con la variedad elegida, el
    // frontend la usa para sugerir fechaSiembraProgramada (aproximado, restando los días de
    // crecimiento de la variedad).
    private LocalDate fechaEntrega;

    // Fecha en la que corresponde sembrar este lote -- independiente de fechaRecepcion, ya
    // que a veces el cliente trae la semilla para sembrarla recién la semana que viene, el
    // mes que viene o en varios meses (change trazabilidad-semillas-siembras, 2026-09-04).
    // Opcional: un registro sin esta fecha simplemente no aparece en los filtros de quincena.
    private LocalDate fechaSiembraProgramada;

    // Ver EstadoRegistroSemilla para la semántica completa de cada valor.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(20) default 'SIN_SEMBRAR'")
    private EstadoRegistroSemilla estado = EstadoRegistroSemilla.SIN_SEMBRAR;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;
}
