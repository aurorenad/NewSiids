package org.example.siidsbackend.Model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Table(name = "job_master")
@Data
public class JobMaster {
    @Id
    @Column(name = "job_master_id")
    private int jobMasterId;

    @Column(name = "structure_id")
    private int structureId;

    @ManyToOne
    @JoinColumn(name = "grade_id", referencedColumnName = "grade_id")
    private Grade gradeId;

    @Column(name = "location_id")
    private Integer locationId;

    @Column(name = "job_title")
    private String jobTitle;

    @Column(name = "num_staffs")
    private short numStaffs;

    @Column(name = "supervisor")
    private String supervisor;

    @Column(name = "working_mode")
    private String workingMode;

    @Column(name = "purpose")
    private String purpose;

    @Column(name = "category_primary_id")
    private Integer categoryPrimaryId;

    @Column(name = "category_exp_id")
    private Integer categoryExpId;

    @Column(name = "category_qualfc_id")
    private Integer categoryQualfcId;

    @Column(name = "num_years")
    private Integer numYears;

    @JsonIgnore
    @OneToMany(mappedBy = "currentJob")
    private List<Employee> Employee;
}
