package org.example.siidsbackend.DTO.Response;

import lombok.Data;
import org.example.siidsbackend.DTO.InformerDTO;
import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.WorkflowStatus;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ReportResponseDTO {
    private Integer id;
    private String description;
    private List<String> attachmentPaths;
    private WorkflowStatus status;
    private String createdBy;
    private String currentRecipient;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Case relatedCase;
    private String assignmentNotes;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String rejectedBy;
    private String rejectionReason;
    private LocalDateTime rejectedAt;
    private String createdByEmployeeId;
    private String returnedBy;
    private String returnReason;
    private LocalDateTime returnedAt;
    private String findings;
    private String recommendations;
    private List<String> findingsAttachmentPaths;
    private String assistantCommissioner;
    private String directorInvestigation;
    private String directorIntelligence;
    private String investigationOfficer;
    private InformerDTO informer;
    private Double principleAmount;
    private Double penaltiesAmount;
}
