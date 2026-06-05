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
    private String directorInvestigationId;
    private String directorIntelligence;
    private String directorIntelligenceId;
    @Data
    public static class OfficerDTO {
        private String employeeId;
        private String givenName;
        private String familyName;
    }

    private OfficerDTO investigationOfficer;
    private InformerDTO informer;
    private Double principleAmount;
    private Double penaltiesAmount;
    private String casePlan;
    private String casePlanDescription;
    private boolean canSubmitFindings;
    private boolean canSubmitCasePlan;
    private boolean canContinueWorking;

    private String generationType;
    private String subject;
    private String legalBasis;

    @Data
    public static class SignatureDTO {
        private String employeeId;
        private String role;
        private String name;
        private String signatureBase64;
        private LocalDateTime signedAt;
    }
    private List<SignatureDTO> signatures;

    private boolean acSigned;
    private boolean directorSigned;
    private boolean isFinalised;
}
