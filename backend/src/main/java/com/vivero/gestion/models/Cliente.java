package com.vivero.gestion.models;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    @OneToOne(mappedBy = "cliente", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.LAZY)
    @ToString.Exclude
    private CuentaCorrienteDinero cuentaCorrienteDinero;

    @OneToOne(mappedBy = "cliente", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.LAZY)
    @ToString.Exclude
    private CuentaCorrienteBandejas cuentaCorrienteBandejas;
}
