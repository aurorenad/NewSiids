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

    private String seizureReason;
    
    private LocalDateTime dateTimeSeized;

    @ManyToOne
    @JoinColumn(name = "pv_in_charge_id", referencedColumnName = "employee_id")
    private Employee pvInCharge;

    @Enumerated(EnumType.STRING)
    private PhysicalStockStatus status;

    @Column(columnDefinition = "TEXT")
    private String officerSignaturePath; // Path or Base64

    @Column(columnDefinition = "TEXT")
    private String returnReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime actionedAt;

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
