package org.example.siidsbackend.Model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class TaxPayer {
    @Id
    private String taxPayerTIN;
    private String taxPayerName;
    private String taxPayerAddress;
    private String taxPayerContact;
}
