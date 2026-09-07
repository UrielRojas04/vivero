package com.vivero.gestion.models;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.ToString;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "clientes")
@SQLDelete(sql = "UPDATE clientes SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
@Data
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombreRazonSocial;

    private String telefono;

    private String dni;

    private String cuil;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_negocio_id")
    private UnidadNegocio unidadNegocio;

    // Nota (change clientes-compartidos-abono, Decisión 2 de design.md): el campo `cuentaAbono`
    // se eliminó de esta entidad a propósito -- la agenda de clientes de Abono ya no se particiona
    // por JEFE/COLEGA. La columna física `cuenta_abono` de la tabla `clientes` se deja intacta y
    // huérfana (no se dropea): ddl-auto=update nunca elimina columnas y el proyecto no tiene
    // Flyway/Liquibase para hacerlo de forma versionada. Incluirla en la primera migración de
    // limpieza si el proyecto adopta una herramienta de migraciones.
    @OneToOne(mappedBy = "cliente", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.LAZY)
    @ToString.Exclude
    private CuentaCorrienteDinero cuentaCorrienteDinero;

    @OneToOne(mappedBy = "cliente", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.LAZY)
    @ToString.Exclude
    private CuentaCorrienteBandejas cuentaCorrienteBandejas;
}
