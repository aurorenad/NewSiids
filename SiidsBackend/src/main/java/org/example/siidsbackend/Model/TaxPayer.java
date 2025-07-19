package org.example.siidsbackend.Model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class TaxPayer {
    @Id
    private String TIN;
    private String taxPayerName;
    private String taxPayerAddress;
}
