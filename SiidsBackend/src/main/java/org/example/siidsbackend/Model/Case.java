package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Date;

@Entity
@Table(name = "`case`")
@Data
public class Case {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer caseNum;
    private String informerId;
    private String informerName;
    private String tin;
    private String taxPayerName;
    private String taxPayerType;
    private String taxPayerAddress;
    private String taxPeriod;
    private LocalDateTime reportedDate;
    private LocalDateTime updatedAt;
    private String summaryOfInformationCase;
    @Enumerated(EnumType.STRING)
    private WorkflowStatus status;
    @ManyToOne
    @JoinColumn(name = "created_by", referencedColumnName = "employee_id")
    private Employee createdBy;
}
