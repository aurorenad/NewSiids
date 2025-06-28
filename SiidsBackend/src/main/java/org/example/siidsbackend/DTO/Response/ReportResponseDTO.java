package org.example.siidsbackend.DTO.Response;

import lombok.Data;
import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.WorkflowStatus;

import java.time.LocalDateTime;

@Data
public class ReportResponseDTO {
    private Integer id;
    private String description;
    private String attachmentPath;
    private WorkflowStatus status;
    private String createdBy;
    private String currentRecipient;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Case relatedCase;
}
