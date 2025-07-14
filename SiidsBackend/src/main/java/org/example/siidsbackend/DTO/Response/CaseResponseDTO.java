package org.example.siidsbackend.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CaseResponseDTO {
    private Integer id;
    private String caseNum;
    private String tin;
    private String taxPeriod;
    private String taxPayerType;
    private String taxPayerName;
    private String taxPayerAddress;
    private String status;
    private String createdByName;
    private String summaryOfInformationCase;
    private String informerId;
    private String informerName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}