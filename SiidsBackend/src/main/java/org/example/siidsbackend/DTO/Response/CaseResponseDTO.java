package org.example.siidsbackend.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.siidsbackend.Model.WorkflowStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CaseResponseDTO {
    private Integer caseNum;
    private String tin;
    private String taxPeriod;
    private String taxPayerType;
    private String taxPayerName;
    private String status;
    private String createdByName;
    private String summaryOfInformationCase;
    private String informerId;
    private String informerName;
}
