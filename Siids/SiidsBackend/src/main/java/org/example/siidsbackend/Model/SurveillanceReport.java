package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@Table(name = "surveillance_reports")
public class SurveillanceReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "mapping_id")
    private SurveillanceMapping mapping;

    @Column(columnDefinition = "TEXT")
    private String findings;

    @Column(columnDefinition = "TEXT")
    private String interrogationDetails;

    private String pvNumber;
    private String seizureNoteNumber;

    @ManyToOne
    @JoinColumn(name = "stock_id")
    private Stock linkedStock; // Link to seized items in store

    @ElementCollection
    @CollectionTable(name = "surveillance_report_attachments", joinColumns = @JoinColumn(name = "report_id"))
    @Column(name = "attachment_path")
    private List<String> attachmentPaths = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private WorkflowStatus status;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private Employee createdBy;

    @ManyToOne
    @JoinColumn(name = "current_recipient")
    private Employee currentRecipient;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
