package org.example.siidsbackend.Model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Data
@ToString
public class Placements {

    @Id
    @Column(name = "placement_id")
    private int placementId;

    @ManyToOne
    @JoinColumn(name = "structure_id", referencedColumnName = "structure_id")
    private structures structure;

    @ManyToOne
    @JoinColumn(name = "job_master_id", referencedColumnName = "job_master_id")
    private JobMaster jobMaster;

    @JsonBackReference
    @OneToOne
    @JoinColumn(name = "employee_id", referencedColumnName = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "date_time", nullable = false)
    private LocalDateTime dateTime;

    @Column(name = "placement_type", nullable = false)
    private int placementType = 0;
}
