package org.example.siidsbackend.Model;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "bank_details")
@JsonSerialize(using = BankDetailsSerializer.class )
public class BankDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bank_id")
    private Long bankId;

    @Column(name = "bank_code", nullable = false)
    private String bankCode;

    @Column(name = "bank_account", nullable = false, unique = true)
    private String bankAccount;

    @Column(name = "bank_name", nullable = false)
    private String bankName;

    // @JsonIgnore
    // @OneToMany(mappedBy="bankDetails", cascade = CascadeType.ALL, orphanRemoval= false)
    // private List<MissionPaymentBatch> missionPaymentBatches = new ArrayList<MissionPaymentBatch>();

    @OneToOne
    @JoinColumn(name ="employee_id", nullable = false)
    private Employee employee;
}