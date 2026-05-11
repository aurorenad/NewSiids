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
public class PVDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String pvNumber;

    @OneToOne
    @JoinColumn(name = "seizure_note_id", nullable = false)
    private SeizureNote seizureNote;

    private String applicableLawReference;
    
    @Column(columnDefinition = "TEXT")
    private String formalStatementText;

    private LocalDateTime transferDate;

    @ManyToOne
    @JoinColumn(name = "pv_in_charge_id", referencedColumnName = "employee_id")
    private Employee pvInCharge;

    private String pendingEditReason;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.transferDate = LocalDateTime.now();
    }
}
