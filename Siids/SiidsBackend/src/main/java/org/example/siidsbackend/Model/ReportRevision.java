package org.example.siidsbackend.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class ReportRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "report_id", nullable = false)
    @JsonIgnore
    private Report report;

    @ManyToOne
    @JoinColumn(name = "revised_by_employee_id", nullable = false)
    private Employee revisedBy;

    @Column(nullable = false)
    private LocalDateTime revisedAt;

    @Column(columnDefinition = "TEXT")
    private String originalContent;

    @Column(columnDefinition = "TEXT")
    private String revisedContent;

    private String revisionNotes;

    @PrePersist
    protected void onCreate() {
        this.revisedAt = LocalDateTime.now();
    }
}
