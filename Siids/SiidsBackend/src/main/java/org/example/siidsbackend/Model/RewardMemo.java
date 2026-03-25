package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@Table(name = "reward_memos")
public class RewardMemo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "related_case_id")
    private Case relatedCase;

    @ManyToOne
    @JoinColumn(name = "informer_id")
    private Informer informer;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Double rewardAmount;

    @ElementCollection
    @CollectionTable(name = "reward_memo_attachments", joinColumns = @JoinColumn(name = "memo_id"))
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

    @ManyToOne
    @JoinColumn(name = "director_intelligence_id")
    private Employee directorIntelligence;

    @ManyToOne
    @JoinColumn(name = "assistant_commissioner_id")
    private Employee assistantCommissioner;

    private LocalDateTime approvedAt;
    private LocalDateTime rejectedAt;
    private String rejectionReason;

    // Finance related
    private boolean processedByFinance;
    private LocalDateTime financeProcessedAt;
    private String bankCheckNumber;

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
