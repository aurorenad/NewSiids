package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeizureNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String seizureNumber;

    private String pvNumber; // Linked PV Reference for Main Stock

    @ManyToOne
    @JoinColumn(name = "case_id", nullable = true)
    private Case relatedCase;

    private String taxpayerTin;
    private String taxpayerName;
    private String taxpayerAddress;
    private String taxpayerContact;
    private String taxpayerType; // KNOWN or UNKNOWN
    private String nationalId;
    
    @Column(columnDefinition = "TEXT")
    private String physicalDescription;
    
    private String representativeName;
    private String representativeContact;

    @Column(columnDefinition = "TEXT")
    private String goodsDescription;

    private Double quantity;
    private String quantityType;

    @Column(columnDefinition = "TEXT")
    private String fullDescription;

    private String locationOfSeizure;
    private String conditionOfGoods;
    private String conveyanceMeans;
    private String conveyanceRegistration;

    private String seizureReason;
    
    private LocalDateTime dateTimeSeized;

    @ManyToOne
    @JoinColumn(name = "pv_in_charge_id", referencedColumnName = "employee_id")
    private Employee pvInCharge;

    @Enumerated(EnumType.STRING)
    private PhysicalStockStatus status;

    @Column(columnDefinition = "TEXT")
    private String officerSignaturePath; // Path or Base64

    // --- State Machine & Workflow Columns ---
    
    @Column(columnDefinition = "TEXT")
    private String returnReason;

    @ManyToOne
    @JoinColumn(name = "returned_by_id", referencedColumnName = "employee_id")
    private Employee returnedBy;

    private LocalDateTime returnDate;

    private String correctionToken; // Token to track resubmission flow

    @ManyToOne
    @JoinColumn(name = "approved_by_id", referencedColumnName = "employee_id")
    private Employee approvedBy;

    private LocalDateTime approvedAt;

    @ManyToOne
    @JoinColumn(name = "release_requested_by_id", referencedColumnName = "employee_id")
    private Employee releaseRequestedBy;

    private LocalDateTime releaseRequestedAt;

    private LocalDateTime releasedAt;

    private String auctionWinner;

    private LocalDateTime auctionDate;

    private Double auctionAmount;

    // --- Timestamps ---

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime actionedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        // Default newly created seizure notes to PENDING_REVIEW as per state machine
        if (this.status == null) {
            this.status = PhysicalStockStatus.PENDING_REVIEW;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
