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
public class ReleaseNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String releaseNumber;

    @ManyToOne
    @JoinColumn(name = "seizure_note_id", nullable = true) // For Temp Stock releases
    private SeizureNote seizureNote;

    @ManyToOne
    @JoinColumn(name = "pv_document_id", nullable = true) // For Main Stock releases
    private PVDocument pvDocument;

    private String releaseType; // "TEMP_STOCK" or "MAIN_STOCK"

    private String releaseReason;
    private String releaseDestination; // Owner, Auction, Destruction
    
    private String recipientName;
    private String recipientIdPassport;

    @ManyToOne
    @JoinColumn(name = "released_by_id", referencedColumnName = "employee_id")
    private Employee releasedBy; // PV in Charge or Stock Manager

    @ManyToOne
    @JoinColumn(name = "prso_approval_id", referencedColumnName = "employee_id", nullable = true)
    private Employee prsoApprover; // Only required for MAIN_STOCK
    
    private LocalDateTime prsoApprovalDate;
    private LocalDateTime releaseDate;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
