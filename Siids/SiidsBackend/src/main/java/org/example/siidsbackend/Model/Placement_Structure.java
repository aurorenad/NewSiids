package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;

@Entity
@Table(name = "placements_structure_map")
@Data
@ToString
public class Placement_Structure {

    @Id
    private int id;

    @OneToOne
    @JoinColumn(name = "employee_id", referencedColumnName = "employee_id", nullable = false)
    private Employee Employee;

    @ManyToOne
    @JoinColumn(name = "structure_id", referencedColumnName = "structure_id")
    private structures structure;
}