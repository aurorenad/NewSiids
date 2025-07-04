package org.example.siidsbackend.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

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

    // Remove the status field since we'll use the Case's status
    // @Enumerated(EnumType.STRING)
    // private WorkflowStatus status = WorkflowStatus.CASE_CREATED;

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