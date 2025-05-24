package org.example.siidsbackend.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "structures")
@Data
@ToString
public class structures {

    @Id
    @Column(name = "structure_id")
    private int structureId;

    @Column(name = "structure_name")
    private String structureName;

    @Column(name = "structure_type")
    private String structureType;

    private short level;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private String createdBy;

    private String reference_id;
}
