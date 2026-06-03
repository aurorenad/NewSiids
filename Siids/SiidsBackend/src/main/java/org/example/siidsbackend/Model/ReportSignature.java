package org.example.siidsbackend.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class ReportSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "report_id", nullable = false)
    @JsonIgnore
    private Report report;

    @ManyToOne
    @JoinColumn(name = "signed_by_employee_id", nullable = false)
    private Employee signedBy;

    // Role of the person signing, e.g., "DIRECTOR_INTELLIGENCE", "ASSISTANT_COMMISSIONER"
    @Column(nullable = false)
    private String signatureRole;

    @Column(nullable = false)
    private LocalDateTime signedAt;

    private String signaturePath;

    @PrePersist
    protected void onCreate() {
        this.signedAt = LocalDateTime.now();
    }
}
