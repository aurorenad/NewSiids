package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class InvestigationReportRequestDTO {
    private String description;
    private String findings;
    private String recommendations;
    private Double principleAmount;
    private Double penaltiesAmount;
    private String assignmentNotes;
}