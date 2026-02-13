package org.example.siidsbackend.DTO;

import lombok.Data;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;

import java.util.List;

@Data
public class OfficerReportsDTO {
    private String officerId;
    private String officerName;
    private List<ReportResponseDTO> reports;
}
