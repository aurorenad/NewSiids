package org.example.siidsbackend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaxPayerDTO {
    private String tin;
    private String name;
    private String address;
    private String contact;
}