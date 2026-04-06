package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockRelease {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id")
    private Stock stock;

    private String releasedItemName;
    private Integer quantityReleased;

    @Enumerated(EnumType.STRING)
    private ReleaseReason releaseReason;

    private LocalDate dateReleased;
    private BigDecimal soldAmount;

    @Column(columnDefinition = "TEXT")
    private String reason;

    private String newPlateNumber;
    private String newOwner;
    private String releasedBy; // The logged-in user who performed the release

    @Column(name = "payment_proof_path")
    private String paymentProofPath;

    @Column(name = "status", columnDefinition = "varchar(255) default 'PENDING'")
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(name = "prso_approved_by")
    private String prsoApprovedBy;

    @Column(columnDefinition = "TEXT", name = "rejection_reason")
    private String rejectionReason;
}
