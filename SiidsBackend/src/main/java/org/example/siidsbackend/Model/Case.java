package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "`case`")
@Data
public class Case {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true)
    private String caseNum;

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



    @PrePersist
    protected void onCreate() {
        this.reportedDate = LocalDateTime.now();
    }

    public String generateCaseNumber() {
        LocalDateTime now = LocalDateTime.now();
        String year = String.format("%02d", now.getYear() % 100);
        String month = String.format("%02d", now.getMonthValue());
        return "CS/" + year + "/" + month + "/" + this.id;
    }

}