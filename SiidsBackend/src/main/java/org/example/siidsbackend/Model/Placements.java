package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;
import com.fasterxml.jackson.annotation.JsonBackReference;


import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Data
@ToString
@Table(name = "placements")
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

    @Column(name = "admin_id", nullable = false)
    private int adminId;

    @Column(name = "placement_type", nullable = false)
    private int placementType = 0;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "eo_meeting_date")
    private LocalDate eoMeetingDate;

    @Column(name = "commencement_date")
    private LocalDate commencementDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "emp_ref_no", nullable = false)
    private String empRefNo;
}
