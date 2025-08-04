package org.example.siidsbackend.DTO;

import lombok.Data;
import org.example.siidsbackend.Model.WorkflowStatus;

import java.time.LocalDateTime;

@Data
public class DirectorIntelligenceReportDTO {
    private String caseNum;
    private WorkflowStatus status;
    private LocalDateTime createdAt;
    private String taxType;
    private String caseDescription;
}