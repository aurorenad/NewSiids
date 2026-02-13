package org.example.siidsbackend.DTO;

import lombok.Data;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class FinesReportDTO {
    private LocalDateTime generatedAt;
    private int reportsWithFinesCount;
    private int reportsWithoutFinesCount;
    private double totalPrincipleAmount;
    private double totalPenaltiesAmount;
    private List<ReportResponseDTO> reportsWithFines;
    private List<ReportResponseDTO> reportsWithoutFines;
}