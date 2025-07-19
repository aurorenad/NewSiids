package org.example.siidsbackend.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String description;
    private String attachmentPath;

    @OneToOne
    @JoinColumn(name = "case_num", referencedColumnName = "caseNum")
    private Case relatedCase;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private Employee createdBy;

    @ManyToOne
    @JoinColumn(name = "current_recipient")
    private Employee currentRecipient;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @ManyToOne
    @JoinColumn(name = "approved_by_employee_id")
    private Employee approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @ManyToOne
    @JoinColumn(name = "rejected_by_employee_id")
    private Employee rejectedBy;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @ManyToOne
    @JoinColumn(name = "returned_by_employee_id")
    private Employee returnedBy;

    @Column(name = "returned_reason")
    private String returnReason;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;
    @ManyToOne
    @JoinColumn(name = "assistant_commissioner_id")
    private Employee assistantCommissioner;

    @ManyToOne
    @JoinColumn(name = "director_investigation_id")
    private Employee directorInvestigation;

    @ManyToOne
    @JoinColumn(name = "director_intelligence_id")
    private Employee directorIntelligence;

    @ManyToOne
    @JoinColumn(name = "investigation_officer_id")
    private Employee investigationOfficer;

    private String findings;
    private String recommendations;

    @ElementCollection
    @CollectionTable(name = "report_findings_attachments", joinColumns = @JoinColumn(name = "report_id"))
    @Column(name = "attachment_path")
    private List<String> findingsAttachmentPaths = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public WorkflowStatus getStatus() {
        return this.relatedCase != null ? this.relatedCase.getStatus() : null;
    }
}