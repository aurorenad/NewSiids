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
public class StockAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String referenceId; // Seizure Number or PV Number

    private String actionType; // e.g., CREATED, ESCALATED, RELEASED, REQUEST_EDIT, APPROVED, REJECTED
    
    @Column(columnDefinition = "TEXT")
    private String details; // e.g., "Transferred to Main Stock", "PRSO Approved Release"

    @ManyToOne
    @JoinColumn(name = "actor_id", referencedColumnName = "employee_id")
    private Employee actor; // The user who performed the action

    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }
}
