package org.example.siidsbackend.Model;

import com.fasterxml.jackson.annotation.JsonBackReference;
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

    @ElementCollection
    @CollectionTable(name = "report_attachments", joinColumns = @JoinColumn(name = "report_id"))
    @Column(name = "attachment_path")
    private List<String> attachmentPaths = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "case_num", referencedColumnName = "caseNum")
    @JsonBackReference
    private Case relatedCase;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private Employee createdBy;

    @ManyToOne
    @JoinColumn(name = "current_recipient")
    private Employee currentRecipient;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Approval/Rejection fields
    @ManyToOne
    @JoinColumn(name = "approved_by_employee_id")
    private Employee approvedBy;
    private LocalDateTime approvedAt;

    @ManyToOne
    @JoinColumn(name = "rejected_by_employee_id")
    private Employee rejectedBy;
    private String rejectionReason;
    private LocalDateTime rejectedAt;

    @ManyToOne
    @JoinColumn(name = "returned_by_employee_id")
    private Employee returnedBy;
    private String returnReason;
    private LocalDateTime returnedAt;
    @Column(name = "return_document_path")
    private String returnDocumentPath;
    @Column(name = "return_document_original_name")
    private String returnDocumentOriginalName;

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

    // Report content
    @Column(columnDefinition = "TEXT")
    private String assignmentNotes;
    private String findings;
    private String recommendations;

    @ElementCollection
    @CollectionTable(name = "report_findings_attachments", joinColumns = @JoinColumn(name = "report_id"))
    @Column(name = "attachment_path")
    private List<String> findingsAttachmentPaths = new ArrayList<>();

    private Double principleAmount;
    private Double penaltiesAmount;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public WorkflowStatus getStatus() {
        return this.relatedCase != null ? this.relatedCase.getStatus() : null;
    }
}