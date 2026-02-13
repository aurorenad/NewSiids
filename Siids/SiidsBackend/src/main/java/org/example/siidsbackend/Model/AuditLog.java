package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private WorkflowStatus action;
    private String description;

    private LocalDateTime timestamp;

    @ManyToOne
    @JoinColumn(name = "performed_by")
    private Employee performedBy;
}
