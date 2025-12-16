package org.example.siidsbackend.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.siidsbackend.DTO.InformerDTO;
import org.example.siidsbackend.DTO.TaxPayerDTO;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CaseResponseDTO {
    private Integer id;
    private String caseNum;

    private TaxPayerDTO taxPayer;

    private String taxPeriod;
    private String taxType;
    private String status;
    private String createdByName;
    private String summaryOfInformationCase;

    private InformerDTO informer;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String referringDepartment;

    private Integer reportId;
}