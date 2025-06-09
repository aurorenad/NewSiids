// Report.java
package org.example.siidsbackend.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class Report {
    @Id
    private Integer id;

    private String description;
    private String attachmentPath;

    @Enumerated(EnumType.STRING)
    private WorkflowStatus status = WorkflowStatus.CASE_CREATED;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private Employee createdBy;

    @ManyToOne
    @JoinColumn(name = "current_recipient")
    private Employee currentRecipient;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_num")
    @JsonIgnore
    private Case relatedCase;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

