package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class ReviseReportRequest {
    private String revisedFindings;
    private String revisedRecommendations;
    private String revisionNotes;
}
