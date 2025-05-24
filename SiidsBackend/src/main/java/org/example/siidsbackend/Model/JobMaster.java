package org.example.siidsbackend.Model;


import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;

@Entity
@Data
@ToString(exclude = {"employees"})
public class JobMaster {

    @Id
    @Column(name = "job_master_id")
    private int jobMasterId;

    @ManyToOne
    private structures structureId;

    @ManyToOne
    @JoinColumn( referencedColumnName = "grade_id")
    private Grade grade;

    private Integer locationId;

    private String jobTitle;

    private short numStaffs;

    private String supervisor;

    private String workingMode;

    private String purpose;

    private Integer categoryPrimaryId;

    private Integer categoryExpId;

    private Integer categoryQualfcId;

    private Integer numYears;

    @OneToOne
    private structures structure;
}
