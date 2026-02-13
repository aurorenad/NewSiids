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

    @ManyToOne
    @JoinColumn(name = "informer_id")
    private Informer informerId;

    @ManyToOne
    @JoinColumn(name = "tax_payer_tin")
    private TaxPayer tin;

    private String taxPeriod;
    private String taxType;
    private LocalDateTime reportedDate;
    private LocalDateTime updatedAt;
    private String summaryOfInformationCase;

    @Column(name = "referring_department")
    private String referringDepartment;

    @Enumerated(EnumType.STRING)
    private WorkflowStatus status;

    @ManyToOne
    @JoinColumn(name = "created_by", referencedColumnName = "employee_id")
    private Employee createdBy;

    @PrePersist
    protected void onCreate() {
        this.reportedDate = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public String generateCaseNumber() {
        LocalDateTime now = LocalDateTime.now();
        String year = String.format("%02d", now.getYear() % 100);
        String month = String.format("%02d", now.getMonthValue());
        return "CS/" + year + "/" + month + "/" + this.id;
    }
}