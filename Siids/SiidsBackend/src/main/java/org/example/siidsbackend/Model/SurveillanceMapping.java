package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@Table(name = "surveillance_mappings")
public class SurveillanceMapping {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String targetName; // Individual or Entity
    private String location;
    private String smugglingRoute;
    private String suspectedItems;

    @ManyToMany
    @JoinTable(
        name = "surveillance_mapping_officers",
        joinColumns = @JoinColumn(name = "mapping_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id")
    )
    private List<Employee> assignedOfficers = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "created_by")
    private Employee createdBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    private WorkflowStatus status; // E.g., SURVEILLANCE_MAPPING_ACTIVE, COMPLETED

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
