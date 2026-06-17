package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.*;
import org.example.siidsbackend.DTO.Request.FindingsRequestDTO;
import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Request.SignReportRequest;
import org.example.siidsbackend.DTO.Response.PageResponseDTO;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.*;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.*;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {
    private static final Set<String> FINDINGS_ATTACHMENT_EXTENSIONS = Set.of(
            ".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx");
    private static final Set<String> RETURN_DOCUMENT_EXTENSIONS = Set.of(".pdf", ".doc", ".docx", ".txt");
    private static final Set<String> CASE_PLAN_ATTACHMENT_EXTENSIONS = Set.of(
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg");

    private final ReportRepo reportRepo;
    private final EmployeeRepo employeeRepo;
    private final CaseRepo caseRepo;
    private final NotificationRepo notificationRepo;
    private final StructureRepository structureRepo;
    private final WebSocketNotificationService webSocketNotificationService;
    private final AuditService auditService;
    private final UserRepo userRepo;
    private final RbacService rbacService;
    private final FileStorageService fileStorageService;

    @Value("${file.max-size:10485760}")
    private long maxFileSize;

    @Transactional
    public Report createReport(ReportRequestDTO dto, List<String> attachmentPaths, String employeeId) {
        Employee creator = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + employeeId));

        Case relatedCase = caseRepo.findByCaseNum(dto.getCaseNum())
                .orElseThrow(() -> new RuntimeException("Case not found with number: " + dto.getCaseNum()));

        // Validate all attachments
        if (attachmentPaths != null) {
            for (String attachmentPath : attachmentPaths) {
                validateAttachment(attachmentPath);
            }
        }

        Report report = new Report();
        report.setDescription(dto.getDescription());
        report.setSubject(dto.getSubject());
        report.setLegalBasis(dto.getLegalBasis());
        report.setAttachmentPaths(attachmentPaths != null ? attachmentPaths : new ArrayList<>());
        report.setCreatedBy(creator);
        report.setRelatedCase(relatedCase);
        report.setCreatedAt(LocalDateTime.now());

        // Set initial recipient - Director of Intelligence
        List<Employee> directors = reportRepo.DirectorsOfIntelligence();
        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        }

        relatedCase.setStatus(WorkflowStatus.REPORT_SUBMITTED);
        caseRepo.save(relatedCase);

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                WorkflowStatus.REPORT_SUBMITTED,
                "Report " + savedReport.getId() + " created by " + creator.getEmployeeId() +
                        " for case " + relatedCase.getCaseNum() + " with " +
                        (attachmentPaths != null ? attachmentPaths.size() : 0) + " attachments",
                creator);

        return savedReport;
    }

    @Transactional
    public Report signReport(Integer reportId, SignReportRequest request, String signerId) {
        if (request == null || request.getRole() == null || request.getRole().isBlank()) {
            throw new IllegalArgumentException("Signature role is required");
        }

        String signatureRole = request.getRole().trim().toUpperCase(Locale.ROOT);
        if (!"DIRECTOR_INTELLIGENCE".equals(signatureRole) && !"ASSISTANT_COMMISSIONER".equals(signatureRole)) {
            throw new IllegalArgumentException("Unsupported signature role: " + request.getRole());
        }

        User user = userRepo.findByUsername(signerId)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + signerId));
        boolean isAdmin = rbacService.isAdmin(user);
        boolean canSignAsDirector = "DIRECTOR_INTELLIGENCE".equals(signatureRole)
                && (isAdmin || rbacService.hasRole(user, "DirectorIntelligence"));
        boolean canSignAsAssistantCommissioner = "ASSISTANT_COMMISSIONER".equals(signatureRole)
                && (isAdmin || rbacService.hasRole(user, "AssistantCommissioner"));

        if (!canSignAsDirector && !canSignAsAssistantCommissioner) {
            throw new SecurityException("You are not allowed to sign as " + signatureRole);
        }

        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));
        Employee signer = employeeRepo.findByEmployeeId(signerId)
                .orElseThrow(() -> new RuntimeException("Signer employee not found with ID: " + signerId));

        if ("ASSISTANT_COMMISSIONER".equals(signatureRole)) {
            validateAssistantCommissionerCanHandle(report, signerId);
        }

        upsertSignature(report, signer, signatureRole, request.getSignatureBase64());

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                savedReport.getRelatedCase() != null ? savedReport.getRelatedCase().getStatus() : WorkflowStatus.REPORT_SUBMITTED,
                "Report " + savedReport.getId() + " signed as " + signatureRole + " by " + signerId,
                signer);
        return savedReport;
    }

    private void upsertSignature(Report report, Employee signer, String signatureRole, String signatureBase64) {
        if (signatureBase64 == null || signatureBase64.isBlank()) {
            throw new IllegalArgumentException("Signature data is required");
        }

        ReportSignature signature = report.getSignatures().stream()
                .filter(existing -> signatureRole.equals(existing.getSignatureRole()))
                .findFirst()
                .orElseGet(() -> {
                    ReportSignature newSignature = new ReportSignature();
                    newSignature.setReport(report);
                    report.getSignatures().add(newSignature);
                    return newSignature;
                });

        signature.setSignedBy(signer);
        signature.setSignatureRole(signatureRole);
        signature.setSignaturePath(signatureBase64.trim());
        signature.setSignedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());
    }

    @Transactional
    public ReportResponseDTO signReportAndMapResponse(Integer reportId, SignReportRequest request, String signerId) {
        return toResponseDTO(signReport(reportId, request, signerId));
    }

    @Transactional(readOnly = true)
    public ReportResponseDTO getReportResponse(Integer reportId) {
        Report report = reportRepo.findByIdWithAttachments(reportId)
                .or(() -> reportRepo.findById(reportId))
                .orElseThrow(() -> new RuntimeException("Report not found"));
        return toResponseDTO(report);
    }

    private void validateAttachment(String attachmentPath) {
        if (attachmentPath != null && !attachmentPath.toLowerCase().endsWith(".pdf")) {
            throw new RuntimeException("Only PDF attachments are allowed");
        }
    }

    @Transactional
    public Report submitFindings(Integer reportId, FindingsRequestDTO findingsDTO, String officerId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        // Verify the officer is assigned to this report
        if (report.getInvestigationOfficer() == null ||
                !report.getInvestigationOfficer().getEmployeeId().equals(officerId)) {
            throw new RuntimeException("You are not the assigned investigation officer for this report");
        }

        // Verify the report is in a valid state for submitting findings
        if (!canSubmitFindings(report)) {
            throw new RuntimeException("Cannot submit findings in current status: " +
                    report.getRelatedCase().getStatus());
        }

        // Process and store attachments
        List<String> attachmentPaths = new ArrayList<>();
        if (findingsDTO.getAttachmentsList() != null) {
            for (MultipartFile file : findingsDTO.getAttachmentsList()) {
                if (!file.isEmpty()) {
                    try {
                        String path = storeFindingsAttachment(file);
                        attachmentPaths.add(path);
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to store attachment: " + e.getMessage());
                    }
                }
            }
        }

        // Update report with findings
        report.setPrincipleAmount(findingsDTO.getPrincipleAmount());
        report.setPenaltiesAmount(findingsDTO.getPenaltiesAmount());
        report.setFindings(findingsDTO.getFindings());
        report.setRecommendations(findingsDTO.getRecommendations());
        report.setFindingsAttachmentPaths(attachmentPaths);
        report.setUpdatedAt(LocalDateTime.now());

        // Update case status
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION);
        caseRepo.save(relatedCase);

        // Set Director of Investigation as recipient
        Employee recipient = report.getDirectorInvestigation();
        if (recipient == null) {
            List<Employee> directors = reportRepo.DirectorsOfInvestigation();
            if (!directors.isEmpty()) recipient = directors.get(0);
        }

        if (recipient != null) {
            report.setCurrentRecipient(recipient);
        } else {
            throw new IllegalStateException("No Director of Investigation found to receive this investigation report.");
        }

        Report savedReport = reportRepo.save(report);

        // Log the action
        auditService.logAction(
                WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION,
                "Investigation findings submitted for report #" + savedReport.getId() +
                        " by officer " + officerId +
                        " with " + attachmentPaths.size() + " attachments",
                report.getInvestigationOfficer());

        // Create notification
        String message = String.format("Investigation findings submitted for report #%d (Case %s) by %s %s",
                savedReport.getId(),
                savedReport.getRelatedCase().getCaseNum(),
                savedReport.getInvestigationOfficer().getGivenName(),
                savedReport.getInvestigationOfficer().getFamilyName());
        createNotification(savedReport, message);

        // Send websocket notification to Director of Investigation
        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("INVESTIGATION_FINDINGS_SUBMITTED");
        webSocketNotificationService.sendNotificationToDirectorsInvestigation(broadcastNotification);

        return savedReport;
    }

    private String storeFindingsAttachment(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty())
            return null;

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String lowerFilename = originalFilename.toLowerCase();
        if (file.getSize() > maxFileSize) {
            throw new Exception("File size exceeds maximum limit of " + maxFileSize + " bytes");
        }

        String storedPath = null;
        try {
            storedPath = fileStorageService.store(file, "findings-attachments", FINDINGS_ATTACHMENT_EXTENSIONS);
            Path filePath = fileStorageService.resolveStoredPath(storedPath);
            verifyStoredFile(filePath, file.getSize());
            if (lowerFilename.endsWith(".pdf")) {
                verifyStoredPdf(filePath);
            } else if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) {
                verifyImageFile(filePath, "jpg");
            } else if (lowerFilename.endsWith(".png")) {
                verifyImageFile(filePath, "png");
            }
            return storedPath;

        } catch (IOException e) {
            cleanupStoredFile(storedPath);
            throw new IOException("Failed to store findings attachment: " + e.getMessage(), e);
        } catch (IllegalArgumentException e) {
            throw new Exception("Only PDF, images (JPG, PNG), and documents (DOC, DOCX, XLS, XLSX) are allowed", e);
        }
    }

    private void verifyStoredFile(Path filePath, long expectedSize) throws IOException {
        if (!Files.exists(filePath) || Files.size(filePath) != expectedSize) {
            throw new IOException("File storage verification failed");
        }
    }

    private void cleanupStoredFile(String storedPath) {
        if (!StringUtils.hasText(storedPath)) {
            return;
        }
        try {
            Files.deleteIfExists(fileStorageService.resolveStoredPath(storedPath));
        } catch (IOException cleanupException) {
            log.error("Failed to cleanup corrupted file: {}", cleanupException.getMessage());
        }
    }

    private void verifyImageFile(Path filePath, String imageType) throws IOException {
        try (InputStream inputStream = Files.newInputStream(filePath)) {
            // Read first few bytes to check image signature
            byte[] header = new byte[8];
            int bytesRead = inputStream.read(header);

            if (bytesRead < 8) {
                throw new IOException("File too small to be a valid image");
            }

            if (imageType.equals("jpg") || imageType.equals("jpeg")) {
                // JPEG starts with FF D8 FF
                if (header[0] != (byte) 0xFF || header[1] != (byte) 0xD8 || header[2] != (byte) 0xFF) {
                    throw new IOException("Invalid JPEG file format");
                }
            } else if (imageType.equals("png")) {
                // PNG starts with 89 50 4E 47 0D 0A 1A 0A
                byte[] pngSignature = { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
                for (int i = 0; i < 8; i++) {
                    if (header[i] != pngSignature[i]) {
                        throw new IOException("Invalid PNG file format");
                    }
                }
            }
        }
    }

    public boolean canSubmitFindings(Report report) {
        if (report.getRelatedCase() == null) return false;
        WorkflowStatus currentStatus = report.getRelatedCase().getStatus();

        // Allowed statuses for submitting findings - expanded for maximum flexibility
        return currentStatus == WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER ||
                currentStatus == WorkflowStatus.INVESTIGATION_IN_PROGRESS ||
                currentStatus == WorkflowStatus.CASE_PLAN_SUBMITTED ||
                currentStatus == WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION ||
                currentStatus == WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION ||
                currentStatus == WorkflowStatus.CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER ||
                currentStatus == WorkflowStatus.CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER ||
                currentStatus == WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER ||
                currentStatus == WorkflowStatus.INVESTIGATION_FINDINGS_SUBMITTED ||
                currentStatus == WorkflowStatus.INVESTIGATION_COMPLETED ||
                currentStatus == WorkflowStatus.CASE_RECEIVED_BY_INVESTIGATION_OFFICER ||
                currentStatus == WorkflowStatus.TAX_ASSESSMENT_IN_PROGRESS;
    }

    public boolean canSubmitCasePlan(Report report) {
        if (report.getRelatedCase() == null) return false;
        WorkflowStatus currentStatus = report.getRelatedCase().getStatus();

        // Broadened statuses for submitting case plans to prevent deadlocks
        return currentStatus == WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER ||
                currentStatus == WorkflowStatus.CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION ||
                currentStatus == WorkflowStatus.CASE_PLAN_REJECTED_BY_ASSISTANT_COMMISSIONER ||
                currentStatus == WorkflowStatus.INVESTIGATION_IN_PROGRESS;
    }

    public boolean canContinueWorking(Report report) {
        if (report.getRelatedCase() == null) return false;
        WorkflowStatus status = report.getRelatedCase().getStatus();
        
        return status != WorkflowStatus.CLOSED && 
               status != WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION &&
               status != WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER;
    }

    @Transactional
    public Report sendToDirectorIntelligence(Integer reportId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        List<Employee> directors = reportRepo.DirectorsOfIntelligence();

        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE);
        caseRepo.save(relatedCase);

        if (directors.isEmpty()) {
            log.info("No Director found via structural query. Attempting fallback via User roles.");
            // Fallback: Find any employee who has the role in the User table
            List<org.example.siidsbackend.Model.User> directorUsers = userRepo.findAll().stream()
                    .filter(u -> rbacService.hasRole(u, "DirectorIntelligence"))
                    .collect(Collectors.toList());
            
            for (org.example.siidsbackend.Model.User user : directorUsers) {
                Optional<Employee> emp = employeeRepo.findByEmployeeId(user.getUsername());
                if (emp.isPresent()) {
                    directors.add(emp.get());
                    break; 
                }
            }
        }

        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        } else {
            throw new IllegalStateException("No Director of Intelligence found in structural mapping or user roles.");
        }

        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE,
                "Report #" + savedReport.getId() + " sent to Director of Intelligence",
                report.getCreatedBy());

        String message = String.format("New report #%d submitted for your review by %s %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName());
        createNotification(savedReport, message);

        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("NEW_REPORT_DIRECTOR_INTELLIGENCE");
        webSocketNotificationService.sendNotificationToDirectorsIntelligence(broadcastNotification);

        return savedReport;
    }

    @Transactional
    public Report sendToDirectorInvestigation(Integer reportId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        List<Employee> directors = reportRepo.DirectorsOfInvestigation();

        report.getRelatedCase().setStatus(WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION);
        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        } else {
            throw new IllegalStateException("No Director of Investigation found.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION,
                "Report #" + savedReport.getId() + " sent to Director of Investigation",
                report.getCreatedBy());

        String message = String.format("New investigation report #%d submitted for your review by %s %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName());
        createNotification(savedReport, message);

        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("NEW_REPORT_DIRECTOR_INVESTIGATION");
        webSocketNotificationService.sendNotificationToDirectorsInvestigation(broadcastNotification);

        return savedReport;
    }

    @Transactional
    public ReportResponseDTO sendToDirectorInvestigationResponse(Integer reportId) {
        Report report = sendToDirectorInvestigation(reportId);
        return toResponseDTO(report);
    }

    @Transactional
    public Report sendToAssistantCommissioner(Integer reportId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        List<Employee> commissioners = reportRepo.assistantCommissioner();

        report.getRelatedCase().setStatus(WorkflowStatus.REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER);
        if (!commissioners.isEmpty()) {
            report.setCurrentRecipient(commissioners.get(0));
        } else {
            throw new IllegalStateException("No Assistant Commissioner found.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        Report savedReport = reportRepo.save(report);

        String message = String.format("Report #%d requires your approval from %s %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName());
        createNotification(savedReport, message);

        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("NEW_REPORT_ASSISTANT_COMMISSIONER");
        webSocketNotificationService.sendNotificationToAssistantCommissioners(broadcastNotification);
        auditService.logAction(
                WorkflowStatus.REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER,
                "Report #" + savedReport.getId() + " sent to Assistant Commissioner",
                report.getCreatedBy());

        return savedReport;
    }

    @Transactional
    public ReportResponseDTO sendToAssistantCommissionerResponse(Integer reportId) {
        Report report = sendToAssistantCommissioner(reportId);
        return toResponseDTO(report);
    }

    @Transactional
    public Report returnReport(Integer reportId, String returnReason, String returnToEmployeeId, String returnerId)
            throws IOException {
        return returnReport(reportId, returnReason, returnToEmployeeId, returnerId, null);
    }

    @Transactional
    public ReportResponseDTO returnReportResponse(Integer reportId, String returnReason, String returnToEmployeeId,
                                                  String returnerId) throws IOException {
        Report report = returnReport(reportId, returnReason, returnToEmployeeId, returnerId);
        return toResponseDTO(report);
    }

    @Transactional
    public Report returnReport(Integer reportId, String returnReason, String returnToEmployeeId, String returnerId,
            MultipartFile returnDocument) throws IOException {
        Report report = getReport(reportId);
        Employee returnTo = employeeRepo.findByEmployeeId(returnToEmployeeId)
                .orElseThrow(() -> new RuntimeException("Return target employee not found"));
        Employee returner = employeeRepo.findByEmployeeId(returnerId)
                .orElseThrow(() -> new RuntimeException("Returner not found"));

        if (returnDocument != null && !returnDocument.isEmpty()) {
            String documentPath = storeReturnDocument(returnDocument);
            report.setReturnDocumentPath(documentPath);
            report.setReturnDocumentOriginalName(returnDocument.getOriginalFilename());
        }

        WorkflowStatus newStatus;
        switch (report.getRelatedCase().getStatus()) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_SUBMITTED:
            case REPORT_RETURNED_TO_INTELLIGENCE_OFFICER:
                newStatus = WorkflowStatus.REPORT_RETURNED_TO_INTELLIGENCE_OFFICER;
                report.setDirectorIntelligence(returner);
                break;
            case REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION:
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
            case REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION:
            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE;
                break;
            case INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION:
            case INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION;
                break;
            default:
                throw new IllegalStateException("Cannot return report in current status");
        }

        report.getRelatedCase().setStatus(newStatus);
        report.setCurrentRecipient(returnTo);
        report.setReturnedBy(returner);
        report.setReturnReason(returnReason);
        report.setReturnedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);

        String message = String.format("Report #%d has been returned by %s %s. Reason: %s",
                savedReport.getId(),
                returner.getGivenName(),
                returner.getFamilyName(),
                returnReason);
        createNotification(savedReport, message);
        auditService.logAction(
                newStatus,
                "Report #" + savedReport.getId() + " returned by " + returner.getEmployeeId() +
                        " to " + returnTo.getEmployeeId() + ". Reason: " + returnReason,
                returner);
        return savedReport;
    }

    // NEW METHOD: Store return document
    private String storeReturnDocument(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty())
            return null;

        try {
            return fileStorageService.store(file, "return-documents", RETURN_DOCUMENT_EXTENSIONS);
        } catch (IllegalArgumentException e) {
            throw new IOException("Only DOC, DOCX, PDF, and TXT files are allowed for return documents");
        }
    }

    private void createNotification(Report report, String message) {
        if (report.getCurrentRecipient() != null) {
            Notification notification = new Notification();
            notification.setMessage(message);
            notification.setRecipient(report.getCurrentRecipient());
            notification.setReport(report);
            notification.setCreatedAt(LocalDateTime.now());
            notification.setRead(false);
            Notification savedNotification = notificationRepo.save(notification);

            NotificationDTO notificationDTO = webSocketNotificationService
                    .createNotificationDTO(report, message, report.getCurrentRecipient());
            if (savedNotification != null) {
                notificationDTO.setId(savedNotification.getId());
            }
            notificationDTO.setNotificationType(getNotificationType(report.getRelatedCase().getStatus()));

            webSocketNotificationService.sendNotificationToUser(
                    report.getCurrentRecipient().getEmployeeId(),
                    notificationDTO);
        }
    }

    private String getNotificationType(WorkflowStatus status) {
        switch (status) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
                return "NEW_REPORT_DIRECTOR_INTELLIGENCE";
            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
                return "NEW_REPORT_DIRECTOR_INVESTIGATION";
            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                return "NEW_REPORT_ASSISTANT_COMMISSIONER";
            case REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER:
                return "REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER";
            case REPORT_SENT_TO_LEGAL_TEAM:
                return "NEW_REPORT_LEGAL_ADVISOR";
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
            case REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION:
            case REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER:
                return "REPORT_APPROVED";
            case REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE:
            case REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION:
            case REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER:
                return "REPORT_REJECTED";
            case REPORT_RETURNED_TO_INTELLIGENCE_OFFICER:
            case REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION:
            case REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_RETURNED_ASSISTANT_COMMISSIONER:
            case REPORT_RETURNED_TO_INVESTIGATION_OFFICER:
                return "REPORT_RETURNED";
            case INVESTIGATION_IN_PROGRESS:
                return "INVESTIGATION_IN_PROGRESS";
            case INVESTIGATION_COMPLETED:
                return "INVESTIGATION_COMPLETED";
            case INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION:
                return "INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION";
            default:
                return "GENERAL_NOTIFICATION";
        }
    }

    public Report getReport(Integer id) {
        return reportRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found"));
    }

    @Transactional
    public Report updateInvestigationStatus(Integer reportId, String statusStr, String notes, String officerId) {
        Report report = getReport(reportId);
        
        if (report.getInvestigationOfficer() == null || !report.getInvestigationOfficer().getEmployeeId().equals(officerId)) {
            throw new RuntimeException("You are not the assigned investigation officer for this report");
        }
        
        WorkflowStatus newStatus;
        try {
            newStatus = WorkflowStatus.valueOf(statusStr);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + statusStr);
        }
        
        Case relatedCase = report.getRelatedCase();
        if (relatedCase != null) {
            relatedCase.setStatus(newStatus);
            relatedCase.setUpdatedAt(LocalDateTime.now());
            Employee officer = employeeRepo.findById(officerId).orElse(null);
            auditService.logAction(newStatus, "Investigation status updated to " + newStatus + " by officer " + officerId, officer);
        }
        
        if (notes != null && !notes.trim().isEmpty()) {
            String timestamp = LocalDateTime.now().toLocalDate().toString() + " " + LocalDateTime.now().toLocalTime().withNano(0).toString();
            String formattedNote = "\n[" + timestamp + "] Investigator Notes: " + notes;
            if (report.getAssignmentNotes() == null) {
                report.setAssignmentNotes(formattedNote);
            } else {
                report.setAssignmentNotes(report.getAssignmentNotes() + formattedNote);
            }
        }
        
        report.setUpdatedAt(LocalDateTime.now());
        return reportRepo.save(report);
    }

    public ReportResponseDTO toResponseDTO(Report report) {
        ReportResponseDTO dto = new ReportResponseDTO();
        dto.setId(report.getId());
        dto.setDescription(report.getDescription());
        dto.setSubject(report.getSubject());
        dto.setLegalBasis(report.getLegalBasis());

        List<String> attachmentPaths = initializedList(report.getAttachmentPaths());
        if (!attachmentPaths.isEmpty()) {
            dto.setAttachmentPaths(attachmentPaths);
        } else if (report.getAttachmentPath() != null) {
            dto.setAttachmentPaths(List.of(report.getAttachmentPath()));
        } else {
            dto.setAttachmentPaths(new ArrayList<>());
        }
        dto.setAssignmentNotes(report.getAssignmentNotes());
        dto.setStatus(report.getRelatedCase() != null ? report.getRelatedCase().getStatus() : null);
        dto.setCreatedBy(report.getCreatedBy().getGivenName() + " " + report.getCreatedBy().getFamilyName());
        dto.setCurrentRecipient(report.getCurrentRecipient() != null
                ? report.getCurrentRecipient().getGivenName() + " " + report.getCurrentRecipient().getFamilyName()
                : null);
        dto.setCreatedAt(report.getCreatedAt());
        dto.setUpdatedAt(report.getUpdatedAt());
        dto.setCreatedByEmployeeId(report.getCreatedBy().getEmployeeId());
        dto.setReturnedBy(report.getReturnedBy() != null
                ? report.getReturnedBy().getGivenName() + " " + report.getReturnedBy().getFamilyName()
                : null);
        dto.setReturnedAt(report.getReturnedAt());
        dto.setReturnReason(report.getReturnReason());
        dto.setDirectorIntelligenceMessage(report.getReturnReason());
        dto.setReturnDocumentPath(report.getReturnDocumentPath());
        dto.setReturnDocumentOriginalName(report.getReturnDocumentOriginalName());
        dto.setHasReturnDocument(report.getReturnDocumentPath() != null || report.getReturnDocumentOriginalName() != null);
        dto.setRelatedCase(report.getRelatedCase());
        dto.setPrincipleAmount(report.getPrincipleAmount());
        dto.setPenaltiesAmount(report.getPenaltiesAmount());
        dto.setFindings(report.getFindings());
        dto.setRecommendations(report.getRecommendations());
        dto.setFindingsAttachmentPaths(initializedList(report.getFindingsAttachmentPaths()));
        dto.setCasePlan(report.getCasePlan());
        dto.setCasePlanDescription(report.getCasePlanDescription());

        if (report.getAssistantCommissioner() != null) {
            dto.setAssistantCommissioner(report.getAssistantCommissioner().getGivenName() + " " + report.getAssistantCommissioner().getFamilyName());
        }
        if (report.getDirectorInvestigation() != null) {
            dto.setDirectorInvestigation(report.getDirectorInvestigation().getGivenName() + " " + report.getDirectorInvestigation().getFamilyName());
            dto.setDirectorInvestigationId(report.getDirectorInvestigation().getEmployeeId());
        }
        if (report.getDirectorIntelligence() != null) {
            dto.setDirectorIntelligence(report.getDirectorIntelligence().getGivenName() + " " + report.getDirectorIntelligence().getFamilyName());
            dto.setDirectorIntelligenceId(report.getDirectorIntelligence().getEmployeeId());
        }

        if (report.getRelatedCase() != null && report.getRelatedCase().getInformerId() != null) {
            dto.setInformer(convertToInformerDTO(report.getRelatedCase().getInformerId()));
        }
        
        // Workflow permission flags for frontend
        dto.setCanSubmitFindings(canSubmitFindings(report));
        dto.setCanSubmitCasePlan(canSubmitCasePlan(report));
        dto.setCanContinueWorking(canContinueWorking(report));
        mapSignatureState(report, dto);
        if (report.getInvestigationOfficer() != null) {
            ReportResponseDTO.OfficerDTO officer = new ReportResponseDTO.OfficerDTO();
            officer.setEmployeeId(report.getInvestigationOfficer().getEmployeeId());
            officer.setGivenName(report.getInvestigationOfficer().getGivenName());
            officer.setFamilyName(report.getInvestigationOfficer().getFamilyName());
            dto.setInvestigationOfficer(officer);
        }
        
        return dto;
    }

    private List<String> initializedList(List<String> values) {
        if (values == null || !Hibernate.isInitialized(values)) {
            return new ArrayList<>();
        }
        return new ArrayList<>(values);
    }

    private void mapSignatureState(Report report, ReportResponseDTO dto) {
        List<ReportSignature> signatures = report.getSignatures() != null
                ? report.getSignatures()
                : new ArrayList<>();

        List<ReportResponseDTO.SignatureDTO> signatureDTOs = signatures.stream()
                .map(signature -> {
                    ReportResponseDTO.SignatureDTO signatureDTO = new ReportResponseDTO.SignatureDTO();
                    signatureDTO.setRole(signature.getSignatureRole());
                    signatureDTO.setSignatureBase64(signature.getSignaturePath());
                    signatureDTO.setSignedAt(signature.getSignedAt());
                    if (signature.getSignedBy() != null) {
                        signatureDTO.setEmployeeId(signature.getSignedBy().getEmployeeId());
                        signatureDTO.setName((signature.getSignedBy().getGivenName() != null ? signature.getSignedBy().getGivenName() : "")
                                + " "
                                + (signature.getSignedBy().getFamilyName() != null ? signature.getSignedBy().getFamilyName() : ""));
                    }
                    return signatureDTO;
                })
                .collect(Collectors.toList());

        dto.setSignatures(signatureDTOs);
        dto.setAcSigned(signatures.stream().anyMatch(signature -> "ASSISTANT_COMMISSIONER".equals(signature.getSignatureRole())));
        dto.setDirectorSigned(signatures.stream().anyMatch(signature -> "DIRECTOR_INTELLIGENCE".equals(signature.getSignatureRole())));
        dto.setFinalised(dto.isAcSigned() && dto.isDirectorSigned());
    }

    private InformerDTO convertToInformerDTO(Informer informer) {
        if (informer == null)
            return null;

        InformerDTO dto = new InformerDTO();
        dto.setInformerId(informer.getInformerId());
        dto.setNationalId(informer.getNationalId());
        dto.setName(informer.getInformerName());
        dto.setGender(informer.getInformerGender());
        dto.setPhoneNum(informer.getInformerPhoneNum());
        dto.setAddress(informer.getInformerAddress());
        dto.setEmail(informer.getInformerEmail());

        return dto;
    }

    public List<Report> getReportsByEmployee(String employeeId) {
        Employee employee = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return reportRepo.findByCreatedByOrderByCreatedAtDesc(employee);
    }

    @Transactional
    public Report receiveCase(Integer reportId, String officerId) {
        Report report = getReport(reportId);
        
        // Verify officer is the assigned one or current recipient
        if (report.getInvestigationOfficer() == null || !report.getInvestigationOfficer().getEmployeeId().equals(officerId)) {
            if (report.getCurrentRecipient() == null || !report.getCurrentRecipient().getEmployeeId().equals(officerId)) {
                throw new RuntimeException("You are not the assigned investigation officer for this report");
            }
        }

        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.CASE_RECEIVED_BY_INVESTIGATION_OFFICER);
        caseRepo.save(relatedCase);
        
        report.setUpdatedAt(LocalDateTime.now());
        Report savedReport = reportRepo.save(report);

        auditService.logAction(
                WorkflowStatus.CASE_RECEIVED_BY_INVESTIGATION_OFFICER,
                "Report #" + savedReport.getId() + " received and acknowledged by investigation officer " + officerId,
                report.getInvestigationOfficer());

        return savedReport;
    }

    public List<Report> getReportsForDirectorIntelligence(String directorId) {
        Map<Integer, Report> reportsById = new LinkedHashMap<>();
        reportRepo.findReportsHandledByDirectorIntelligence()
                .forEach(report -> reportsById.put(report.getId(), report));
        reportRepo.findReportsSubmittedToDirectorIntelligence()
                .forEach(report -> reportsById.putIfAbsent(report.getId(), report));
        return new ArrayList<>(reportsById.values());
    }

    @Transactional(readOnly = true)
    public List<ReportResponseDTO> getReportDtosForDirectorIntelligence(String directorId) {
        return getReportsForDirectorIntelligence(directorId).stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponseDTO<ReportResponseDTO> getReportPageForDirectorIntelligence(
            String directorId,
            int requestedPage,
            int requestedSize,
            String search,
            String sortDirection) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        boolean ascending = "asc".equalsIgnoreCase(sortDirection);

        List<ReportResponseDTO> rows = getReportsForDirectorIntelligence(directorId).stream()
                .map(this::toResponseDTO)
                .filter(report -> normalizedSearch.isBlank()
                        || String.valueOf(report.getId()).contains(normalizedSearch)
                        || containsIgnoreCase(report.getCreatedBy(), normalizedSearch)
                        || containsIgnoreCase(report.getCreatedByEmployeeId(), normalizedSearch)
                        || (report.getRelatedCase() != null
                        && containsIgnoreCase(report.getRelatedCase().getCaseNum(), normalizedSearch))
                        || containsIgnoreCase(report.getStatus() != null ? report.getStatus().name() : "", normalizedSearch))
                .sorted((left, right) -> {
                    LocalDateTime leftDate = left.getCreatedAt();
                    LocalDateTime rightDate = right.getCreatedAt();
                    int comparison = Comparator.nullsLast(LocalDateTime::compareTo).compare(leftDate, rightDate);
                    return ascending ? comparison : -comparison;
                })
                .toList();

        return toPageResponse(rows, requestedPage, requestedSize);
    }

    private boolean containsIgnoreCase(String value, String search) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(search);
    }

    private <T> PageResponseDTO<T> toPageResponse(List<T> rows, int requestedPage, int requestedSize) {
        int size = requestedSize > 0 ? Math.min(requestedSize, 100) : 10;
        int page = Math.max(requestedPage, 0);
        int totalElements = rows.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);
        return new PageResponseDTO<>(rows.subList(fromIndex, toIndex), page, size, totalElements, totalPages);
    }

    @Transactional
    public Report approveReport(Integer reportId, String approverId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee approver = employeeRepo.findByEmployeeId(approverId)
                .orElseThrow(() -> new RuntimeException("Approver not found"));

        Case relatedCase = report.getRelatedCase();
        WorkflowStatus newStatus;

        switch (relatedCase.getStatus()) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_SUBMITTED:
            case CASE_PLAN_SUBMITTED:
                if (relatedCase.getStatus() == WorkflowStatus.CASE_PLAN_SUBMITTED) {
                    newStatus = WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION;
                    // Forward case plan to Director of Investigation
                    List<Employee> invDirectors = reportRepo.DirectorsOfInvestigation();
                    if (!invDirectors.isEmpty()) {
                        report.setCurrentRecipient(invDirectors.get(0));
                    }
                } else {
                    newStatus = WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE;
                    report.setDirectorIntelligence(approver);

                    List<Employee> commissioners = reportRepo.assistantCommissioner();
                    if (!commissioners.isEmpty()) {
                        report.setCurrentRecipient(commissioners.get(0));
                    }
                }
                break;

            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
                newStatus = WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION;
                report.setAssistantCommissioner(approver);
                // After Assistant Commissioner approves, send to Director of Investigation
                List<Employee> directors = reportRepo.DirectorsOfInvestigation();
                if (!directors.isEmpty()) {
                    report.setCurrentRecipient(directors.get(0));
                }
                break;

            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION;
                report.setDirectorInvestigation(approver);
                // After Director of Investigation approves, send to Legal Advisor
                List<Employee> legalAdvisors = reportRepo.findLegalAdvisors();
                if (!legalAdvisors.isEmpty()) {
                    report.setCurrentRecipient(legalAdvisors.get(0));
                } else {
                    // If no legal advisor, send back to Assistant Commissioner
                    List<Employee> assistantCommissioners = reportRepo.assistantCommissioner();
                    if (!assistantCommissioners.isEmpty()) {
                        report.setCurrentRecipient(assistantCommissioners.get(0));
                    }
                }
                break;

            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION;
                report.setAssistantCommissioner(approver);

                List<Employee> investigationDirectors = reportRepo.DirectorsOfInvestigation();
                if (!investigationDirectors.isEmpty()) {
                    report.setCurrentRecipient(investigationDirectors.get(0));
                }
                break;

            case INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION:
            case INVESTIGATION_COMPLETED:
                newStatus = WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION;
                report.setDirectorInvestigation(approver);
                report.setInvestigationReportApprovedBy(approver.getGivenName() + " " + approver.getFamilyName());
                report.setInvestigationReportApprovedAt(LocalDateTime.now());
                
                // Forward to Assistant Commissioner for final approval
                List<Employee> acs = reportRepo.assistantCommissioner();
                if (!acs.isEmpty()) {
                    report.setCurrentRecipient(acs.get(0));
                    report.setAssistantCommissioner(acs.get(0)); // Track that it's handled by AC now
                }
                break;
            case INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER;
                report.setAssistantCommissioner(approver);
                report.setApprovedBy(approver);
                report.setApprovedAt(LocalDateTime.now());
                break;
            default:
                throw new IllegalStateException("Cannot approve report in current status: " + relatedCase.getStatus());
        }

        relatedCase.setStatus(newStatus);
        caseRepo.save(relatedCase);

        report.setApprovedBy(approver);
        report.setApprovedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);

        String message = String.format("Your report #%d has been approved by %s %s",
                savedReport.getId(),
                approver.getGivenName(),
                approver.getFamilyName());
        createNotification(savedReport, message);

        auditService.logAction(
                newStatus,
                "Report " + savedReport.getId() + " approved by " + approver.getEmployeeId(),
                approver);

        return savedReport;
    }

    @Transactional
    public ReportResponseDTO approveReportResponse(Integer reportId, String approverId) {
        Report report = approveReport(reportId, approverId);
        return toResponseDTO(report);
    }

    @Transactional
    public Report approveCaseIntakeByAssistantCommissioner(
            Integer reportId,
            String approverId,
            String routeDepartment,
            String signatureBase64,
            String routingNotes) {
        validateAssistantCommissioner(approverId);

        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));
        Employee approver = employeeRepo.findByEmployeeId(approverId)
                .orElseThrow(() -> new RuntimeException("Approver not found"));
        validateAssistantCommissionerCanHandle(report, approverId);

        Case relatedCase = report.getRelatedCase();
        if (relatedCase == null || relatedCase.getStatus() != WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE) {
            throw new IllegalStateException("Cannot approve case intake in current status: "
                    + (relatedCase != null ? relatedCase.getStatus() : "UNKNOWN"));
        }

        String normalizedRoute = normalizeAssistantCommissionerRoute(routeDepartment);
        relatedCase.setReferringDepartment(normalizedRoute);

        if ("Director of Investigation".equalsIgnoreCase(normalizedRoute)) {
            List<Employee> directors = reportRepo.DirectorsOfInvestigation();
            if (directors.isEmpty()) {
                throw new IllegalStateException("No Director of Investigation found to receive report.");
            }
            relatedCase.setStatus(WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION);
            report.setCurrentRecipient(directors.get(0));
        } else if ("Legal Advisor".equalsIgnoreCase(normalizedRoute)) {
            List<Employee> legalAdvisors = reportRepo.findLegalAdvisors();
            if (legalAdvisors.isEmpty()) {
                throw new IllegalStateException("No Legal Advisor found to receive report.");
            }
            Employee legalAdvisor = legalAdvisors.get(0);
            relatedCase.setStatus(WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM);
            report.setLegalAdvisor(legalAdvisor);
            report.setCurrentRecipient(legalAdvisor);
        } else {
            relatedCase.setStatus(WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER);
            report.setCurrentRecipient(null);
        }

        report.setAssistantCommissioner(approver);
        report.setApprovedBy(approver);
        report.setApprovedAt(LocalDateTime.now());
        if (routingNotes != null && !routingNotes.trim().isEmpty()) {
            report.setAssignmentNotes(routingNotes.trim());
        }
        report.setUpdatedAt(LocalDateTime.now());
        upsertSignature(report, approver, "ASSISTANT_COMMISSIONER", signatureBase64);

        caseRepo.save(relatedCase);
        Report savedReport = reportRepo.save(report);

        String message = String.format("Report #%d has been approved by Assistant Commissioner %s %s and routed to %s",
                savedReport.getId(),
                approver.getGivenName(),
                approver.getFamilyName(),
                normalizedRoute);
        createNotification(savedReport, message);
        auditService.logAction(
                relatedCase.getStatus(),
                "Report " + savedReport.getId() + " approved by Assistant Commissioner " + approverId
                        + " and routed to " + normalizedRoute
                        + (routingNotes != null && !routingNotes.trim().isEmpty()
                        ? ". Notes: " + routingNotes.trim()
                        : ""),
                approver);

        return savedReport;
    }

    private String normalizeAssistantCommissionerRoute(String routeDepartment) {
        if (routeDepartment == null || routeDepartment.trim().isEmpty()) {
            throw new IllegalArgumentException("Route department is required");
        }

        String route = routeDepartment.trim();
        Set<String> fixedRoutes = Set.of(
                "Director of Investigation",
                "Legal Advisor",
                "Prosecution",
                "Enforcement",
                "Collection",
                "To be filled");

        if (fixedRoutes.stream().anyMatch(allowed -> allowed.equalsIgnoreCase(route))) {
            return fixedRoutes.stream()
                    .filter(allowed -> allowed.equalsIgnoreCase(route))
                    .findFirst()
                    .orElse(route);
        }

        if (route.length() < 2 || route.length() > 120) {
            throw new IllegalArgumentException("Custom department name must be between 2 and 120 characters");
        }

        return route;
    }

    @Transactional
    public Report rejectReport(Integer reportId, String rejectionReason, String rejectorId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee rejector = employeeRepo.findByEmployeeId(rejectorId)
                .orElseThrow(() -> new RuntimeException("Rejector not found"));
        User rejectorUser = userRepo.findByUsername(rejectorId).orElse(null);
        boolean rejectorIsAssistantCommissioner = rbacService.hasAnyRole(rejectorUser, "Admin", "AssistantCommissioner");

        WorkflowStatus newStatus;
        switch (report.getRelatedCase().getStatus()) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE;
                report.setDirectorIntelligence(rejector);
                break;
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
                if (rejectorIsAssistantCommissioner) {
                    newStatus = WorkflowStatus.REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER;
                    report.setAssistantCommissioner(rejector);
                    if (report.getDirectorIntelligence() != null) {
                        report.setCurrentRecipient(report.getDirectorIntelligence());
                    } else {
                        List<Employee> directors = reportRepo.DirectorsOfIntelligence();
                        if (!directors.isEmpty()) {
                            report.setCurrentRecipient(directors.get(0));
                        }
                    }
                } else {
                    newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE;
                    report.setDirectorIntelligence(rejector);
                }
                break;
            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION;
                report.setDirectorInvestigation(rejector);
                break;
            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER;
                report.setAssistantCommissioner(rejector);
                break;
            case INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION:
            case INVESTIGATION_COMPLETED:
                newStatus = WorkflowStatus.INVESTIGATION_REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION;
                report.setDirectorInvestigation(rejector);
                report.setInvestigationReportRejectedBy(rejector.getGivenName() + " " + rejector.getFamilyName());
                report.setInvestigationReportRejectedAt(LocalDateTime.now());
                report.setInvestigationReportRejectionReason(rejectionReason);
                
                // Return to investigation officer
                if (report.getInvestigationOfficer() != null) {
                    report.setCurrentRecipient(report.getInvestigationOfficer());
                }
                break;
            case INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.INVESTIGATION_REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER;
                report.setAssistantCommissioner(rejector);
                
                // Return to Director of Investigation
                List<Employee> dists = reportRepo.DirectorsOfInvestigation();
                if (!dists.isEmpty()) {
                    report.setCurrentRecipient(dists.get(0));
                }
                break;
            default:
                throw new IllegalStateException(
                        "Cannot reject report in current status: " + report.getRelatedCase().getStatus());
        }

        report.getRelatedCase().setStatus(newStatus);
        report.setRejectedBy(rejector);
        report.setRejectionReason(rejectionReason);
        report.setRejectedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());
        
        // Only set recipient to creator if not already set in the switch
        if (report.getCurrentRecipient() == null || report.getCurrentRecipient().equals(rejector)) {
            report.setCurrentRecipient(report.getCreatedBy());
        }

        Report savedReport = reportRepo.save(report);

        String message = String.format("Your report #%d has been rejected by %s %s. Reason: %s",
                savedReport.getId(),
                rejector.getGivenName(),
                rejector.getFamilyName(),
                rejectionReason != null ? rejectionReason : "No reason provided");
        createNotification(savedReport, message);
        auditService.logAction(
                newStatus,
                "Report " + savedReport.getId() + " rejected by " + rejector.getEmployeeId() +
                        (rejectionReason != null ? ". Reason: " + rejectionReason : ""),
                rejector);
        return savedReport;
    }

    @Transactional
    public ReportResponseDTO rejectReportResponse(Integer reportId, String rejectionReason, String rejectorId) {
        Report report = rejectReport(reportId, rejectionReason, rejectorId);
        return toResponseDTO(report);
    }

    public List<Report> getApprovedReportsForAssistantCommissioner(String employeeId) {
        validateAssistantCommissioner(employeeId);
        // Broadened to include all handled and relevant cases for AC
        return reportRepo.findReportsHandledAssistantCommissioner();
    }

    @Transactional(readOnly = true)
    public PageResponseDTO<ReportResponseDTO> getApprovedReportPageForAssistantCommissioner(
            String employeeId,
            int requestedPage,
            int requestedSize,
            String search,
            String view) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String normalizedView = view == null ? "INTAKE" : view.trim().toUpperCase(Locale.ROOT);

        List<ReportResponseDTO> rows = getApprovedReportsForAssistantCommissioner(employeeId).stream()
                .map(this::toResponseDTO)
                .filter(report -> matchesAssistantCommissionerView(report, normalizedView))
                .filter(report -> matchesReportSearch(report, normalizedSearch))
                .sorted((left, right) -> Comparator.nullsLast(LocalDateTime::compareTo)
                        .compare(right.getCreatedAt(), left.getCreatedAt()))
                .toList();

        return toPageResponse(rows, requestedPage, requestedSize);
    }

    private boolean matchesAssistantCommissionerView(ReportResponseDTO report, String view) {
        String status = report.getStatus() == null ? "" : report.getStatus().name();
        boolean investigation = status.contains("INVESTIGATION");
        boolean casePlan = status.contains("CASE_PLAN");

        if ("INVESTIGATION".equals(view)) {
            return investigation;
        }

        if ("ALL".equals(view)) {
            return true;
        }

        return !investigation && !casePlan;
    }

    private boolean matchesReportSearch(ReportResponseDTO report, String normalizedSearch) {
        return normalizedSearch.isBlank()
                || String.valueOf(report.getId()).contains(normalizedSearch)
                || containsIgnoreCase(report.getCreatedBy(), normalizedSearch)
                || containsIgnoreCase(report.getCreatedByEmployeeId(), normalizedSearch)
                || (report.getRelatedCase() != null
                && containsIgnoreCase(report.getRelatedCase().getCaseNum(), normalizedSearch))
                || containsIgnoreCase(report.getStatus() != null ? report.getStatus().name() : "", normalizedSearch);
    }

    private void validateAssistantCommissioner(String employeeId) {
        List<Employee> assistantCommissioners = reportRepo.assistantCommissioner();
        boolean isAssistantCommissioner = assistantCommissioners.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));

        if (!isAssistantCommissioner) {
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
            if (user == null) {
                log.error("Access denied: User not found for username: {}", employeeId);
                throw new RuntimeException("User account not found for: " + employeeId);
            }
            
            String userRole = user.getRole() != null ? user.getRole().trim() : "";
            log.info("Validating AC access for user: {}, role: '{}'", employeeId, userRole);

            // Case-insensitive and trimmed comparison for all variations
            boolean hasAcRole = rbacService.hasAnyRole(user, "Admin", "AssistantCommissioner");
                                
            if (!hasAcRole) {
                log.error("Access denied: User {} has role '{}', expected Assistant Commissioner", employeeId, userRole);
                throw new RuntimeException("Access denied: User " + employeeId + " does not have the Assistant Commissioner role. (System found role: '" + userRole + "')");
            }
        }
    }

    private void validateAssistantCommissionerCanHandle(Report report, String employeeId) {
        validateAssistantCommissioner(employeeId);

        WorkflowStatus status = report.getRelatedCase() != null ? report.getRelatedCase().getStatus() : null;
        boolean actionableStatus = status == WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE
                || status == WorkflowStatus.CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER
                || status == WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION
                || status == WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER;

        if (!actionableStatus) {
            throw new IllegalStateException("Assistant Commissioner cannot sign report in current status: " + status);
        }

        // Assistant Commissioners can act on AC-visible queue records, including
        // records assigned to another AC user when the dashboard is used as a role queue.
    }

    public List<Report> getReportsApprovedByAssistantCommissionerForDirectorInvestigation(String directorId) {
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(directorId));

        if (!isDirector) {
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(directorId).orElse(null);
            if (!rbacService.hasAnyRole(user, "Admin", "DirectorInvestigation")) {
                throw new RuntimeException("Employee is not a Director of Investigation");
            }
        }

        return reportRepo.findReportsHandledByDirectorInvestigation(directorId);
    }

    @Transactional(readOnly = true)
    public PageResponseDTO<ReportResponseDTO> getReportPageForDirectorInvestigation(
            String directorId,
            int requestedPage,
            int requestedSize,
            String search,
            String view) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String normalizedView = view == null ? "ALL" : view.trim().toUpperCase(Locale.ROOT);

        List<ReportResponseDTO> rows = getReportsApprovedByAssistantCommissionerForDirectorInvestigation(directorId).stream()
                .map(this::toResponseDTO)
                .filter(report -> matchesDirectorInvestigationView(report, normalizedView))
                .filter(report -> matchesDirectorInvestigationSearch(report, normalizedSearch))
                .sorted((left, right) -> Comparator.nullsLast(LocalDateTime::compareTo)
                        .compare(right.getUpdatedAt(), left.getUpdatedAt()))
                .toList();

        return toPageResponse(rows, requestedPage, requestedSize);
    }

    private boolean matchesDirectorInvestigationView(ReportResponseDTO report, String view) {
        String status = report.getStatus() == null ? "" : report.getStatus().name();
        boolean hasFindings = StringUtils.hasText(report.getFindings())
                || StringUtils.hasText(report.getRecommendations())
                || (report.getFindingsAttachmentPaths() != null && !report.getFindingsAttachmentPaths().isEmpty())
                || status.contains("INVESTIGATION_REPORT")
                || status.contains("FINDINGS")
                || "INVESTIGATION_COMPLETED".equals(status);
        boolean hasCasePlan = StringUtils.hasText(report.getCasePlan()) || status.contains("CASE_PLAN");
        boolean assigned = report.getInvestigationOfficer() != null;
        String investigationReportStatus = getInvestigationReportBucket(status);
        String casePlanStatus = getCasePlanBucket(status);

        return switch (view) {
            case "PENDING" -> !status.contains("COMPLETED")
                    && (!assigned || (assigned && !hasFindings && !hasCasePlan
                    && "none".equals(investigationReportStatus) && "none".equals(casePlanStatus)));
            case "INVESTIGATION_REPORT" -> hasFindings || !"none".equals(investigationReportStatus);
            case "CASE_PLAN" -> hasCasePlan || !"none".equals(casePlanStatus);
            default -> true;
        };
    }

    private boolean matchesDirectorInvestigationSearch(ReportResponseDTO report, String normalizedSearch) {
        if (normalizedSearch.isBlank()) {
            return true;
        }

        String officerName = report.getInvestigationOfficer() == null ? "" :
                (Objects.toString(report.getInvestigationOfficer().getGivenName(), "") + " "
                        + Objects.toString(report.getInvestigationOfficer().getFamilyName(), ""));

        return String.valueOf(report.getId()).contains(normalizedSearch)
                || (report.getRelatedCase() != null
                && containsIgnoreCase(report.getRelatedCase().getCaseNum(), normalizedSearch))
                || containsIgnoreCase(report.getStatus() != null ? report.getStatus().name() : "", normalizedSearch)
                || containsIgnoreCase(officerName, normalizedSearch)
                || containsIgnoreCase(report.getAssignmentNotes(), normalizedSearch);
    }

    private String getCasePlanBucket(String status) {
        if (status == null) {
            return "none";
        }
        if (status.contains("CASE_PLAN_APPROVED")) {
            return "approved";
        }
        if (status.contains("CASE_PLAN_REJECTED")) {
            return "rejected";
        }
        if (status.contains("CASE_PLAN_SUBMITTED") || status.contains("CASE_PLAN_SENT")) {
            return "submitted";
        }
        return "none";
    }

    private String getInvestigationReportBucket(String status) {
        if (status == null) {
            return "none";
        }
        if (status.contains("INVESTIGATION_REPORT_APPROVED")) {
            return "approved";
        }
        if (status.contains("INVESTIGATION_REPORT_REJECTED")) {
            return "rejected";
        }
        if (status.contains("INVESTIGATION_REPORT_RETURNED")) {
            return "returned";
        }
        if (status.contains("FINDINGS_SUBMITTED")
                || status.contains("INVESTIGATION_REPORT_SUBMITTED")
                || "INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION".equals(status)) {
            return "submitted";
        }
        if (status.contains("INVESTIGATION_COMPLETED")) {
            return "completed";
        }
        return "none";
    }

    @Transactional
    public Report assignToInvestigationOfficer(Integer reportId, String specificOfficerId, String assignmentNotes, String assignerId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee assignedOfficer;

        if (specificOfficerId != null && !specificOfficerId.trim().isEmpty()) {
            assignedOfficer = employeeRepo.findByEmployeeId(specificOfficerId)
                    .orElseThrow(() -> new RuntimeException("Officer not found with ID: " + specificOfficerId));

            List<Employee> availableOfficers = reportRepo.findAvailableT3Officers();
            boolean isValidOfficer = availableOfficers.stream()
                    .anyMatch(officer -> officer.getEmployeeId().equals(specificOfficerId));

            if (!isValidOfficer) {
                throw new RuntimeException("Employee is not a valid T3 Investigation Officer");
            }
        } else {
            assignedOfficer = findBestAvailableOfficer();
        }

        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER);
        caseRepo.save(relatedCase);

        report.setAssignmentNotes(assignmentNotes);
        report.setCurrentRecipient(assignedOfficer);
        report.setInvestigationOfficer(assignedOfficer);
        
        // Save who assigned the task so we can return to them later
        if (assignerId != null) {
            Employee assigner = employeeRepo.findByEmployeeId(assignerId).orElse(null);
            if (assigner != null) {
                report.setDirectorInvestigation(assigner);
            }
        }
        
        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);

        String message = String.format(
                "Investigation report #%d has been assigned to you for investigation by %s %s. Instructions: %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName(),
                assignmentNotes != null ? assignmentNotes : "No specific instructions provided");
        createNotification(savedReport, message);

        NotificationDTO notificationDTO = webSocketNotificationService
                .createNotificationDTO(savedReport, message, assignedOfficer);
        notificationDTO.setNotificationType("REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER");
        webSocketNotificationService.sendNotificationToUser(
                assignedOfficer.getEmployeeId(),
                notificationDTO);
        auditService.logAction(
                WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER,
                "Report #" + savedReport.getId() + " assigned to investigation officer " +
                        assignedOfficer.getEmployeeId() + " with notes: " + assignmentNotes,
                report.getCurrentRecipient());

        return savedReport;
    }

    private Employee findBestAvailableOfficer() {
        List<Employee> availableOfficers = reportRepo.findAvailableT3Officers();

        if (availableOfficers.isEmpty()) {
            throw new RuntimeException("No available T3 Investigation Officers found");
        }

        Employee bestOfficer = availableOfficers.get(0);
        int minWorkload = getCurrentWorkload(bestOfficer.getEmployeeId());

        for (Employee officer : availableOfficers) {
            int workload = getCurrentWorkload(officer.getEmployeeId());
            if (workload < minWorkload) {
                minWorkload = workload;
                bestOfficer = officer;
            }
        }

        return bestOfficer;
    }

    private int getCurrentWorkload(String officerId) {
        return reportRepo.countActiveReportsByOfficer(officerId);
    }

    public List<Employee> getAvailableInvestigationOfficers() {
        return reportRepo.findAvailableT3Officers();
    }

    public List<Report> getAllReportsForDirectorInvestigation(String directorId) {
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(directorId));

        if (!isDirector) {
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(directorId).orElse(null);
            if (!rbacService.hasAnyRole(user, "Admin", "DirectorInvestigation")) {
                throw new RuntimeException("Employee is not a Director of Investigation");
            }
        }

        return reportRepo.findReportsHandledByDirectorInvestigation(directorId);
    }

    public ResponseEntity<Resource> downloadAttachment(String filename) {
        return downloadAttachment(filename, false);
    }

    public ResponseEntity<Resource> downloadAttachment(String filename, boolean inline) {
        try {
            Path filePath = fileStorageService.resolveStoredPath(filename);

            if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
                log.warn("Attachment not found or not readable: {}", filename);
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/pdf";
            }

            String originalFilename = fileStorageService.extractDownloadFilename(filename);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            contentDisposition(originalFilename, inline))
                    .body(resource);

        } catch (Exception e) {
            log.error("Error downloading file {}: {}", filename, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String contentDisposition(String filename, boolean inline) {
        String safeFilename = filename == null ? "document" : filename.replace("\"", "");
        String dispositionType = inline ? "inline" : "attachment";
        return dispositionType + "; filename=\"" + safeFilename + "\"";
    }

    public Map<String, Object> getFileInfo(String filename) {
        try {
            Path filePath = fileStorageService.resolveStoredPath(filename);

            if (!Files.exists(filePath)) {
                throw new RuntimeException("File not found: " + filename);
            }

            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("filename", filename);
            fileInfo.put("size", Files.size(filePath));
            fileInfo.put("contentType", Files.probeContentType(filePath));
            fileInfo.put("lastModified", Files.getLastModifiedTime(filePath).toString());

            String originalFilename = filename;
            if (filename.contains("_")) {
                originalFilename = filename.substring(filename.indexOf("_") + 1);
            }
            fileInfo.put("originalFilename", originalFilename);

            return fileInfo;

        } catch (Exception e) {
            throw new RuntimeException("Error getting file info: " + e.getMessage(), e);
        }
    }

    public ResponseEntity<Resource> downloadReportAttachment(Integer reportId, String filename, String requesterId) {
        return downloadReportAttachment(reportId, filename, requesterId, false);
    }

    public ResponseEntity<Resource> downloadReportAttachment(Integer reportId, String filename, String requesterId,
            boolean inline) {
        log.info("downloadReportAttachment called reportId={}, filename={}, requesterId={}, inline={}", reportId, filename, requesterId, inline);
        try {
            Optional<Report> maybeReport = reportRepo.findByIdWithAttachments(reportId)
                    .or(() -> reportRepo.findById(reportId));
            if (maybeReport.isEmpty()) {
                log.warn("Report not found for attachment download: {}", reportId);
                return ResponseEntity.notFound().build();
            }
            Report report = maybeReport.get();

            Optional<Employee> maybeRequester = employeeRepo.findByEmployeeId(requesterId);
            if (maybeRequester.isEmpty()) {
                log.warn("Requester not found as employeeId={}", requesterId);
                throw new SecurityException("Requester is not allowed to access this report attachment");
            }
            Employee requester = maybeRequester.get();

            if (!hasAccessToReport(report, requester)) {
                log.warn("Requester {} denied access to report {} attachments", requesterId, reportId);
                throw new SecurityException("Requester is not allowed to access this report attachment");
            }

            Optional<String> maybeStoredFilename = resolveStoredFilenameForReport(report, filename);
            if (maybeStoredFilename.isEmpty()) {
                log.warn("Attachment filename {} is not part of report {}", filename, reportId);
                return ResponseEntity.notFound().build();
            }

            String storedFilename = maybeStoredFilename.get();
            String downloadLabel = fileStorageService.extractDownloadFilename(storedFilename);
            auditService.logAction(
                    WorkflowStatus.ATTACHMENT_DOWNLOADED,
                    "Attachment '" + downloadLabel + "' downloaded from report #" + reportId + " by " + requesterId,
                    requester);

            ResponseEntity<Resource> response = downloadAttachment(storedFilename, inline);
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn("Attachment download returned non-2xx status {} for {}", response.getStatusCode(), storedFilename);
            }
            return response;

        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error downloading report attachment {} for report {}", filename, reportId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private boolean hasAccessToReport(Report report, Employee employee) {
        if (report.getCreatedBy() != null && report.getCreatedBy().getEmployeeId().equals(employee.getEmployeeId())) {
            return true;
        }

        if (report.getCurrentRecipient() != null &&
                report.getCurrentRecipient().getEmployeeId().equals(employee.getEmployeeId())) {
            return true;
        }

        List<Employee> directors = new ArrayList<>();
        directors.addAll(reportRepo.DirectorsOfIntelligence());
        directors.addAll(reportRepo.DirectorsOfInvestigation());
        directors.addAll(reportRepo.assistantCommissioner());
        directors.addAll(reportRepo.findAvailableT3Officers());

        return directors.stream().anyMatch(d -> d.getEmployeeId().equals(employee.getEmployeeId()));
    }

    private Optional<String> resolveStoredFilenameForReport(Report report, String filename) {
        if (!StringUtils.hasText(filename) || report == null) {
            return Optional.empty();
        }

        String candidateName = Paths.get(filename).getFileName().toString();
        if (report.getAttachmentPath() != null) {
            if (report.getAttachmentPath().equals(filename) || report.getAttachmentPath().equals(candidateName)) {
                return Optional.of(report.getAttachmentPath());
            }
            if (fileStorageService.extractDownloadFilename(report.getAttachmentPath()).equals(filename) ||
                    fileStorageService.extractDownloadFilename(report.getAttachmentPath()).equals(candidateName)) {
                return Optional.of(report.getAttachmentPath());
            }
        }

        if (report.getAttachmentPaths() != null) {
            for (String path : report.getAttachmentPaths()) {
                if (path == null) continue;
                if (path.equals(filename) || path.equals(candidateName)) {
                    return Optional.of(path);
                }
                String storedOriginal = fileStorageService.extractDownloadFilename(path);
                if (storedOriginal.equals(filename) || storedOriginal.equals(candidateName)) {
                    return Optional.of(path);
                }
            }
        }

        if (report.getFindingsAttachmentPaths() != null) {
            for (String path : report.getFindingsAttachmentPaths()) {
                if (path == null) continue;
                if (path.equals(filename) || path.equals(candidateName)) {
                    return Optional.of(path);
                }
                String storedOriginal = fileStorageService.extractDownloadFilename(path);
                if (storedOriginal.equals(filename) || storedOriginal.equals(candidateName)) {
                    return Optional.of(path);
                }
            }
        }

        return Optional.empty();
    }

    private void verifyStoredPdf(Path filePath) throws IOException {
        try (InputStream fileStream = Files.newInputStream(filePath)) {
            byte[] buffer = new byte[1024];
            int bytesRead = fileStream.read(buffer);

            if (bytesRead < 5) {
                throw new IOException("File too small to be a valid PDF");
            }

            // Check for PDF header (more lenient)
            String header = new String(buffer, 0, Math.min(8, bytesRead));
            if (!header.startsWith("%PDF")) {
                throw new IOException("Invalid PDF header: " + header);
            }

            // Check for PDF structure markers (more lenient)
            String content = new String(buffer, 0, bytesRead);
            if (!content.contains("obj")) {
                throw new IOException("Missing required PDF objects");
            }

            // Check for EOF marker (more lenient)
            long fileSize = Files.size(filePath);
            if (fileSize > 10) {
                byte[] endBuffer = new byte[10];
                try (InputStream endStream = Files.newInputStream(filePath)) {
                    endStream.skip(fileSize - 10);
                    endStream.read(endBuffer);
                    String endMarker = new String(endBuffer);
                    // Check for EOF or endstream markers
                    if (!endMarker.contains("%%EOF") && !endMarker.contains("endstream")) {
                        log.warn("PDF might not have standard EOF marker: {}", endMarker);
                        // Don't throw exception, just log warning
                    }
                }
            }

        } catch (IOException e) {
            throw new IOException("Error verifying stored PDF: " + e.getMessage(), e);
        }
    }

    public List<Report> getReportsByCaseNum(String caseNum) {
        Case relatedCase = caseRepo.findByCaseNum(caseNum)
                .orElseThrow(() -> new RuntimeException("Case not found with number: " + caseNum));

        return reportRepo.findByRelatedCase(relatedCase);
    }

    public List<Report> getAllReportsForDirectorIntelligence(String directorId) {
        return reportRepo.findReportsHandledByDirectorIntelligence();
    }

    @Transactional(readOnly = true)
    public List<ReportResponseDTO> getAllReportDtosForDirectorIntelligence(String directorId) {
        return getAllReportsForDirectorIntelligence(directorId).stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    public List<Report> getReportsHandledByAssistantCommissioner(String employeeId) {
        List<Employee> assistantCommissioners = reportRepo.assistantCommissioner();
        boolean isAssistantCommissioner = assistantCommissioners.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));

        if (!isAssistantCommissioner) {
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
            if (!rbacService.hasAnyRole(user, "Admin", "AssistantCommissioner")) {
                throw new RuntimeException("Employee is not an Assistant Commissioner");
            }
        }

        // Return both pending and handled reports
        return reportRepo.findReportsHandledAssistantCommissioner();
    }

    public List<Report> getReportsHandledByDirectorInvestigation(String directorId) {
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(directorId));

        if (!isDirector) {
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(directorId).orElse(null);
            if (!rbacService.hasAnyRole(user, "Admin", "DirectorInvestigation")) {
                throw new RuntimeException("Employee is not a Director of Investigation");
            }
        }

        return reportRepo.findReportsHandledByDirectorInvestigation(directorId);
    }

    @Transactional
    public Report updateReturnedReport(Integer reportId, ReportRequestDTO reportData) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        if (!isReportReturned(report)) {
            throw new RuntimeException("Report is not in a returned status");
        }

        if (reportData.getDescription() != null) {
            report.setDescription(reportData.getDescription());
        }
        if (reportData.getSubject() != null) {
            report.setSubject(reportData.getSubject());
        }
        if (reportData.getLegalBasis() != null) {
            report.setLegalBasis(reportData.getLegalBasis());
        }

        WorkflowStatus newStatus;
        switch (report.getRelatedCase().getStatus()) {
            case REPORT_RETURNED_TO_INTELLIGENCE_OFFICER:
                newStatus = WorkflowStatus.REPORT_SUBMITTED;
                break;
            case REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE:
                newStatus = WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE;
                break;
            case REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION;
                break;
            case REPORT_RETURNED_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER;
                break;
            case REPORT_RETURNED_TO_INVESTIGATION_OFFICER:
                newStatus = WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM;
                break;
            default:
                throw new IllegalStateException("Cannot update report in current status");
        }

        report.getRelatedCase().setStatus(newStatus);
        report.setUpdatedAt(LocalDateTime.now());
        report.setReturnReason(null);
        report.setReturnedBy(null);
        report.setReturnedAt(null);

        if (newStatus == WorkflowStatus.REPORT_SUBMITTED) {
            List<Employee> directors = reportRepo.DirectorsOfIntelligence();
            if (!directors.isEmpty()) {
                report.setCurrentRecipient(directors.get(0));
            }
        } else if (newStatus == WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE) {
            List<Employee> directors = reportRepo.DirectorsOfIntelligence();
            if (!directors.isEmpty()) {
                report.setCurrentRecipient(directors.get(0));
            }
        } else if (newStatus == WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION) {
            List<Employee> directors = reportRepo.DirectorsOfInvestigation();
            if (!directors.isEmpty()) {
                report.setCurrentRecipient(directors.get(0));
            }
        } else if (newStatus == WorkflowStatus.REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER) {
            List<Employee> commissioners = reportRepo.assistantCommissioner();
            if (!commissioners.isEmpty()) {
                report.setCurrentRecipient(commissioners.get(0));
            }
        } else if (newStatus == WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM) {
            List<Employee> legalAdvisors = reportRepo.findLegalAdvisors();
            if (!legalAdvisors.isEmpty()) {
                report.setCurrentRecipient(legalAdvisors.get(0));
            }
        }

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                newStatus,
                "Returned report #" + savedReport.getId() + " updated and resubmitted by " +
                        savedReport.getCreatedBy().getEmployeeId(),
                savedReport.getCreatedBy());

        String message = String.format("Returned report #%d has been updated and resubmitted by %s %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName());
        createNotification(savedReport, message);

        return savedReport;
    }

    private boolean isReportReturned(Report report) {
        return report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_INTELLIGENCE_OFFICER ||
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION ||
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE ||
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_ASSISTANT_COMMISSIONER ||
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER;
    }

    public FinesReportDTO generateFinesReportForAssistantCommissioner(String employeeId) {
        // Verify the employee is an assistant commissioner or admin
        List<Employee> assistantCommissioners = reportRepo.assistantCommissioner();
        boolean isAssistantCommissioner = assistantCommissioners.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));

        if (!isAssistantCommissioner) {
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
            if (!rbacService.hasAnyRole(user, "Admin", "AssistantCommissioner")) {
                throw new RuntimeException("Employee is not an Assistant Commissioner");
            }
        }

        // Get reports with and without fines
        List<Report> reportsWithFines = reportRepo.findReportsWithFines();
        List<Report> reportsWithoutFines = reportRepo.findReportsWithoutFines();

        // Calculate totals
        double totalPrinciple = reportsWithFines.stream()
                .mapToDouble(r -> r.getPrincipleAmount() != null ? r.getPrincipleAmount() : 0)
                .sum();

        double totalPenalties = reportsWithFines.stream()
                .mapToDouble(r -> r.getPenaltiesAmount() != null ? r.getPenaltiesAmount() : 0)
                .sum();

        // Calculate averages

        // Build and return the DTO
        FinesReportDTO reportDTO = new FinesReportDTO();
        reportDTO.setGeneratedAt(LocalDateTime.now());
        reportDTO.setReportsWithFinesCount(reportsWithFines.size());
        reportDTO.setReportsWithoutFinesCount(reportsWithoutFines.size());
        reportDTO.setTotalPrincipleAmount(totalPrinciple);
        reportDTO.setTotalPenaltiesAmount(totalPenalties);
        reportDTO.setReportsWithFines(reportsWithFines.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList()));
        reportDTO.setReportsWithoutFines(reportsWithoutFines.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList()));

        return reportDTO;
    }

    public FinesReportDTO generatePenaltiesReportForAssistantCommissioner(String employeeId) {
        // Logic for penalties report (currently similar to fines but can be specialized)
        return generateFinesReportForAssistantCommissioner(employeeId);
    }

    public List<DirectorIntelligenceReportDTO> getDirectorIntelligenceReport(String directorId) {
        return reportRepo.findCasesForDirectorIntelligenceReport();
    }

    public List<OfficerReportsDTO> getReportsByT3Officers() {
        List<Employee> officers = reportRepo.findAvailableT3Officers();
        List<OfficerReportsDTO> result = new ArrayList<>();

        for (Employee officer : officers) {
            List<Report> reports = reportRepo.findByCreatedByOrderByCreatedAtDesc(officer);
            List<ReportResponseDTO> reportDTOs = reports.stream()
                    .map(this::toResponseDTO)
                    .collect(Collectors.toList());

            OfficerReportsDTO dto = new OfficerReportsDTO();
            dto.setOfficerId(officer.getEmployeeId());
            dto.setOfficerName(officer.getGivenName() + " " + officer.getFamilyName());
            dto.setReports(reportDTOs);

            result.add(dto);
        }
        return result;
    }

    public List<Report> fetchDashboardDataForIO(String officerId) {
        log.info("Fetching operational dashboard data for officer: '{}'", officerId);
        
        List<String> activeStatuses = Arrays.asList(
                WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER.name(),
                WorkflowStatus.INVESTIGATION_IN_PROGRESS.name(),
                WorkflowStatus.CASE_PLAN_SUBMITTED.name(),
                WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION.name(),
                WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION.name(),
                WorkflowStatus.CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION.name(),
                WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER.name(),
                WorkflowStatus.INVESTIGATION_COMPLETED.name(),
                WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION.name(),
                WorkflowStatus.CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER.name(),
                WorkflowStatus.REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER.name(),
                WorkflowStatus.CASE_RECEIVED_BY_INVESTIGATION_OFFICER.name(),
                WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION.name(),
                "REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE"
        );

        List<Report> reports = reportRepo.queryActiveInvestigations(officerId.trim(), activeStatuses);
        log.info("Dashboard query returned {} results for officer '{}'", reports.size(), officerId);
        return reports;
    }

    public List<Report> getReportsAssignedToInvestigationOfficers(String officerId) {
        return reportRepo.findReportsByInvestigationOfficer(officerId.trim());
    }

    public List<Report> getHistoricalReportsForInvestigationOfficer(String officerId) {
        return reportRepo.findReportsByInvestigationOfficer(officerId.trim());
    }

    public List<Report> getAllReportsForInvestigationOfficer(String officerId) {
        return reportRepo.findReportsByInvestigationOfficer(officerId.trim());
    }

    public PageResponseDTO<ReportResponseDTO> getInvestigationOfficerReportPage(
            String officerId,
            boolean activeOnly,
            int page,
            int size,
            String search) {
        String normalizedSearch = normalizeSearch(search);
        List<ReportResponseDTO> rows = (activeOnly
                ? fetchDashboardDataForIO(officerId)
                : getHistoricalReportsForInvestigationOfficer(officerId)).stream()
                .map(this::toResponseDTO)
                .filter(report -> matchesReportSearch(report, normalizedSearch))
                .toList();
        return toPageResponse(rows, page, size);
    }

    public PageResponseDTO<ReportResponseDTO> getLegalAdvisorReportPage(
            String legalAdvisorId,
            int page,
            int size,
            String search) {
        String normalizedSearch = normalizeSearch(search);
        List<ReportResponseDTO> rows = getReportsForLegalAdvisor(legalAdvisorId).stream()
                .map(this::toResponseDTO)
                .filter(report -> matchesReportSearch(report, normalizedSearch))
                .toList();
        return toPageResponse(rows, page, size);
    }

    @Transactional
    public void sendReportToDepartment(Integer id, String department) {
        log.info("Received department: '{}' for report ID: {}", department, id);
        Report report = getReport(id);

        String normalizedDept = department.trim();

        // Special handling for Investigation
        if ("Investigation".equalsIgnoreCase(normalizedDept)) {
            List<Employee> directors = reportRepo.DirectorsOfInvestigation();
            if (!directors.isEmpty()) {
                report.getRelatedCase().setStatus(WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION);
                report.setCurrentRecipient(directors.get(0));
                save(report);
                return;
            } else {
                throw new IllegalStateException("No Director of Investigation found to receive report.");
            }
        }

        Map<String, WorkflowStatus> deptWorkflowMap = Map.of(
                "Legal Services and Board Affairs", WorkflowStatus.REPORT_SENT_TO_LEGAL_SERVICES_AND_BOARD_AFFAIRS,
                "Customs Services", WorkflowStatus.REPORT_SENT_TO_CUSTOMS_SERVICES,
                "Finance", WorkflowStatus.REPORT_SENT_TO_FINANCE,
                "Strategy and Risk Analysis", WorkflowStatus.REPORT_SENT_TO_STRATEGIC_AND_RISK_ANALYSIS,
                "Internal Audit and Integrity", WorkflowStatus.REPORT_SENT_TO_INTERNAL_AUDIT_AND_INTEGRITY,
                "IT and Digital Transformation", WorkflowStatus.REPORT_SENT_TO_IT_AND_DIGITAL_TRANSFORMATION,
                "Domestic Taxes", WorkflowStatus.REPORT_SENT_TO_DOMESTIC_TAXES);
        
        List<structures> departments = structureRepo.findByStructureType("Department");
        boolean validDepartment = departments.stream()
                .anyMatch(d -> d.getStructureName().equalsIgnoreCase(normalizedDept));

        if (!validDepartment) {
            throw new IllegalArgumentException("Invalid department: " + department);
        }

        // Pick workflow status
        WorkflowStatus status = deptWorkflowMap.get(normalizedDept);
        if (status == null) {
            throw new IllegalArgumentException("No workflow mapping found for department: " + department);
        }

        // Update report case status
        report.getRelatedCase().setStatus(status);

        save(report);
    }

    public void save(Report report) {
        reportRepo.save(report);
    }

    public List<structures> getAllDepartments() {
        return structureRepo.findByStructureType("Department");
    }

    public List<Employee> getLegalAdvisors() {
        return reportRepo.findLegalAdvisors();
    }

    @Transactional
    public Report sendToLegalAdvisor(Integer reportId) {
        log.info("sendToLegalAdvisor called for reportId: {}", reportId);
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        log.info("Report {} found. Current case status: {}", reportId,
                report.getRelatedCase() != null ? report.getRelatedCase().getStatus() : "NO CASE");

        List<Employee> legalAdvisors = reportRepo.findLegalAdvisors();
        log.info("Found {} legal advisors", legalAdvisors.size());

        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM);
        caseRepo.save(relatedCase);

        if (!legalAdvisors.isEmpty()) {
            Employee advisor = legalAdvisors.get(0);
            report.setCurrentRecipient(advisor);
            report.setLegalAdvisor(advisor); // Set the legal advisor tracking field
        } else {
            throw new IllegalStateException("No Legal Advisor found.");
        }

        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM,
                "Report #" + savedReport.getId() + " sent to Legal Advisor",
                report.getCreatedBy());

        String message = String.format("Report #%d requires legal review from %s %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName());
        createNotification(savedReport, message);

        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("NEW_REPORT_LEGAL_ADVISOR");
        webSocketNotificationService.sendNotificationToLegalAdvisors(broadcastNotification);

        return savedReport;
    }

    public List<Report> getReportsForLegalAdvisor(String legalAdvisorId) {
        // Verify the employee is a legal advisor
        List<Employee> legalAdvisors = reportRepo.findLegalAdvisors();
        boolean isLegalAdvisor = legalAdvisors.stream()
                .anyMatch(la -> la.getEmployeeId().equals(legalAdvisorId));

        if (!isLegalAdvisor) {
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(legalAdvisorId).orElse(null);
            if (!rbacService.hasAnyRole(user, "Admin", "LegalAdvisor")) {
                throw new RuntimeException("Employee is not a Legal Advisor");
            }
        }

        // Return all reports where they are the assigned legal advisor or current recipient
        return reportRepo.findReportsByLegalAdvisor(legalAdvisorId);
    }

    public List<Report> getAllReportsWithLegalAdvisors() {
        return reportRepo.findReportsWithLegalAdvisors();
    }

    @Transactional
    public Report returnToAssistantCommissioner(Integer reportId, String returnReason, String legalAdvisorId) {
        Report report = getReport(reportId);

        // Verify legal advisor is the current recipient
        if (report.getCurrentRecipient() == null ||
                !report.getCurrentRecipient().getEmployeeId().equals(legalAdvisorId)) {
            throw new RuntimeException("You are not the assigned legal advisor for this report");
        }

        // Get the Assistant Commissioner who sent it (it should be stored in assistantCommissioner field)
        Employee assistantCommissioner = report.getAssistantCommissioner();
        if (assistantCommissioner == null) {
            // Fallback: look for Assistant Commissioners if not explicitly set
            List<Employee> acs = reportRepo.assistantCommissioner();
            if (!acs.isEmpty()) {
                assistantCommissioner = acs.get(0);
            } else {
                throw new RuntimeException("No Assistant Commissioner found to return to");
            }
        }

        // Update case status - using existing status to avoid DB constraint issues
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.REPORT_RETURNED_ASSISTANT_COMMISSIONER);
        caseRepo.save(relatedCase);

        // Update report
        report.setCurrentRecipient(assistantCommissioner);
        report.setReturnedBy(employeeRepo.findByEmployeeId(legalAdvisorId).orElse(null));
        report.setReturnReason(returnReason);
        report.setReturnedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);

        // Create notification
        String message = String.format("Report #%d has been returned by Legal Advisor. Reason: %s",
                savedReport.getId(),
                returnReason);
        createNotification(savedReport, message);

        // Send websocket notification to the Assistant Commissioner
        NotificationDTO notificationDTO = webSocketNotificationService
                .createNotificationDTO(savedReport, message, assistantCommissioner);
        notificationDTO.setNotificationType("REPORT_RETURNED_FROM_LEGAL");
        webSocketNotificationService.sendNotificationToUser(
                assistantCommissioner.getEmployeeId(),
                notificationDTO);

        auditService.logAction(
                WorkflowStatus.REPORT_RETURNED_ASSISTANT_COMMISSIONER,
                "Report #" + savedReport.getId() + " returned to Assistant Commissioner " +
                        assistantCommissioner.getEmployeeId() + " by legal advisor " + legalAdvisorId +
                        ". Reason: " + returnReason,
                report.getReturnedBy());

        return savedReport;
    }

    @Transactional
    public ReportResponseDTO editReturnedReport(Integer reportId, ReportRequestDTO reportData,
            List<String> newAttachmentPaths, String editorId,
            String returnReason) {

        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));
        Employee editor = employeeRepo.findByEmployeeId(editorId)
                .orElseThrow(() -> new RuntimeException("Editor not found"));

        if (!canEditReport(report, editorId)) {
            throw new RuntimeException("You are not authorized to edit this report");
        }

        report.setDescription(reportData.getDescription());
        if (reportData.getSubject() != null) {
            report.setSubject(reportData.getSubject());
        }
        if (reportData.getLegalBasis() != null) {
            report.setLegalBasis(reportData.getLegalBasis());
        }
        report.setUpdatedAt(LocalDateTime.now());

        List<String> allAttachments = new ArrayList<>();
        if (report.getAttachmentPaths() != null) {
            allAttachments.addAll(report.getAttachmentPaths());
        }
        if (newAttachmentPaths != null && !newAttachmentPaths.isEmpty()) {
            allAttachments.addAll(newAttachmentPaths);
        }
        report.setAttachmentPaths(allAttachments);

        report.setReturnReason(null);
        report.setReturnedBy(null);
        report.setReturnedAt(null);
        report.setReturnDocumentPath(null);
        report.setReturnDocumentOriginalName(null);

        Case relatedCase = report.getRelatedCase();
        Employee nextRecipient = determineNextRecipientAfterEdit(report, editor);
        if (nextRecipient != null) {
            report.setCurrentRecipient(nextRecipient);
        }

        WorkflowStatus newStatus = determineStatusAfterEdit(report, editor);
        relatedCase.setStatus(newStatus);
        caseRepo.save(relatedCase);

        Report savedReport = reportRepo.save(report);

        if (savedReport.getAttachmentPaths() != null) {
            savedReport.getAttachmentPaths().size();
        }
        if (savedReport.getFindingsAttachmentPaths() != null) {
            savedReport.getFindingsAttachmentPaths().size();
        }

        List<String> findingsAttachments = savedReport.getFindingsAttachmentPaths() == null
                ? List.of()
                : new ArrayList<>(savedReport.getFindingsAttachmentPaths());

        String descriptionForAudit = reportData.getDescription() != null ? reportData.getDescription() : "";
        String actionDescription = String.format(
                "Report #%d edited by %s. Original return reason: %s. Changes: %s",
                savedReport.getId(),
                editor.getEmployeeId(),
                returnReason != null ? returnReason : "N/A",
                descriptionForAudit.length() > 100 ? descriptionForAudit.substring(0, 100) + "..."
                        : descriptionForAudit);

        auditService.logAction(
                newStatus,
                actionDescription,
                editor);

        String message = String.format(
                "Report #%d has been edited and resubmitted by %s %s. " +
                        "Original return reason addressed: %s",
                savedReport.getId(),
                editor.getGivenName(),
                editor.getFamilyName(),
                returnReason != null ? returnReason : "N/A");

        createNotification(savedReport, message);

        ReportResponseDTO response = toResponseDTO(savedReport);
        response.setFindingsAttachmentPaths(new ArrayList<>(findingsAttachments));
        return response;
    }

    public boolean canEditReport(Report report, String employeeId) {
        // Check if report is in a returned status
        WorkflowStatus status = report.getRelatedCase().getStatus();
        boolean isReturnedStatus = status == WorkflowStatus.REPORT_RETURNED_TO_INTELLIGENCE_OFFICER ||
                status == WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION ||
                status == WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE ||
                status == WorkflowStatus.REPORT_RETURNED_ASSISTANT_COMMISSIONER ||
                status == WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER;

        if (!isReturnedStatus) {
            return false;
        }

        // Check if employee is authorized to edit
        // 1. The creator can always edit their returned report
        if (report.getCreatedBy() != null &&
                report.getCreatedBy().getEmployeeId().equals(employeeId)) {
            return true;
        }

        // 2. The current recipient can edit if they are the return target
        if (report.getCurrentRecipient() != null &&
                report.getCurrentRecipient().getEmployeeId().equals(employeeId)) {
            return true;
        }

        // 3. The person who returned it can edit (for corrections)
        if (report.getReturnedBy() != null &&
                report.getReturnedBy().getEmployeeId().equals(employeeId)) {
            return true;
        }

        return false;
    }

    private Employee determineNextRecipientAfterEdit(Report report, Employee editor) {
        WorkflowStatus currentStatus = report.getRelatedCase().getStatus();

        switch (currentStatus) {
            case REPORT_RETURNED_TO_INTELLIGENCE_OFFICER:
            case REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE:
                // Send back to Director of Intelligence
                List<Employee> intelDirectors = reportRepo.DirectorsOfIntelligence();
                return intelDirectors.isEmpty() ? null : intelDirectors.get(0);

            case REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION:
                // Send back to Director of Investigation
                List<Employee> invDirectors = reportRepo.DirectorsOfInvestigation();
                return invDirectors.isEmpty() ? null : invDirectors.get(0);

            case REPORT_RETURNED_TO_INVESTIGATION_OFFICER:
                // Send back to Legal Advisor (or Director of Investigation)
                List<Employee> legalAdvisors = reportRepo.findLegalAdvisors();
                if (!legalAdvisors.isEmpty()) {
                    return legalAdvisors.get(0);
                } else {
                    List<Employee> directors = reportRepo.DirectorsOfInvestigation();
                    return directors.isEmpty() ? null : directors.get(0);
                }
            case REPORT_RETURNED_ASSISTANT_COMMISSIONER:
                List<Employee> commissioners = reportRepo.assistantCommissioner();
                return commissioners.isEmpty() ? null : commissioners.get(0);

            default:
                return null;
        }
    }

    private WorkflowStatus determineStatusAfterEdit(Report report, Employee editor) {
        WorkflowStatus currentStatus = report.getRelatedCase().getStatus();

        switch (currentStatus) {
            case REPORT_RETURNED_TO_INTELLIGENCE_OFFICER:
            case REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE:
                return WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE;

            case REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION:
                return WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION;

            case REPORT_RETURNED_TO_INVESTIGATION_OFFICER:
                return WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM;

            case REPORT_RETURNED_ASSISTANT_COMMISSIONER:
                return WorkflowStatus.REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER;

            default:
                return WorkflowStatus.REPORT_SUBMITTED;
        }
    }

    @Transactional
    public Report submitCasePlan(Integer reportId, String casePlanDescription, MultipartFile casePlanAttachment,
            String employeeId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee submitter = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Check if the submitter is the investigation officer assigned to this report
        if (report.getInvestigationOfficer() == null) {
            throw new RuntimeException("No investigation officer is currently assigned to this report. Please contact your Director.");
        }
        
        if (!report.getInvestigationOfficer().getEmployeeId().equals(employeeId)) {
            throw new RuntimeException("You are not the assigned investigation officer for this report. Assigned officer ID: " 
                + report.getInvestigationOfficer().getEmployeeId());
        }

        // Validate current status using centralized logic
        if (!canSubmitCasePlan(report)) {
            throw new IllegalStateException("Cannot submit case plan in current status: " + report.getRelatedCase().getStatus() + 
                ". Valid statuses for this action are: Assigned, Rejected Plan, or In Progress.");
        }

        // Set case plan text
        if (casePlanDescription != null && !casePlanDescription.trim().isEmpty()) {
            report.setCasePlanDescription(casePlanDescription);
        }

        String casePlanAttachmentPath = null;
        if (casePlanAttachment != null && !casePlanAttachment.isEmpty()) {
            try {
                validateCasePlanAttachment(casePlanAttachment);
                casePlanAttachmentPath = storeCasePlanAttachment(casePlanAttachment);
                report.setCasePlan(casePlanAttachmentPath);
                if (report.getFindingsAttachmentPaths() == null) {
                    report.setFindingsAttachmentPaths(new ArrayList<>());
                }
                report.getFindingsAttachmentPaths().add(casePlanAttachmentPath);
            } catch (Exception e) {
                throw new RuntimeException("Failed to store case plan attachment: " + e.getMessage());
            }
        }

        // Update case status
        if (report.getRelatedCase() != null) {
            report.getRelatedCase().setStatus(WorkflowStatus.CASE_PLAN_SUBMITTED);
            caseRepo.save(report.getRelatedCase());
        }

        // Set Director of Intelligence as primary recipient for initial review
        Employee recipient = report.getDirectorIntelligence();
        if (recipient == null) {
            List<Employee> intelligenceDirectors = reportRepo.DirectorsOfIntelligence();
            if (!intelligenceDirectors.isEmpty()) {
                recipient = intelligenceDirectors.get(0);
                report.setDirectorIntelligence(recipient);
            }
        }
        
        // Fallback to Director of Investigation if no Intelligence Director found
        if (recipient == null) {
            recipient = report.getDirectorInvestigation();
            if (recipient == null) {
                List<Employee> investigationDirectors = reportRepo.DirectorsOfInvestigation();
                if (!investigationDirectors.isEmpty()) recipient = investigationDirectors.get(0);
            }
        }

        if (recipient != null) {
            report.setCurrentRecipient(recipient);
        } else {
            throw new IllegalStateException("No Director found to receive this case plan.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.CASE_PLAN_SUBMITTED,
                "Case plan submitted for report #" + savedReport.getId() + " by investigation officer " + employeeId,
                submitter);

        // Create notification
        String message = String.format("Case plan submitted for report #%d by investigation officer %s %s",
                savedReport.getId(),
                submitter.getGivenName(),
                submitter.getFamilyName());
        createNotification(savedReport, message);

        // Send websocket notification to Director of Investigation
        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("CASE_PLAN_SUBMITTED");
        webSocketNotificationService.sendNotificationToDirectorsInvestigation(broadcastNotification);

        return savedReport;
    }

    @Transactional
    public Report sendCasePlanToAssistantCommissioner(Integer reportId, String employeeId) {
        Report report = getReport(reportId);

        // Update case status
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER);
        caseRepo.save(relatedCase);

        // Set recipient - Assistant Commissioner
        List<Employee> commissioners = reportRepo.assistantCommissioner();
        if (!commissioners.isEmpty()) {
            report.setCurrentRecipient(commissioners.get(0));
            report.setAssistantCommissioner(commissioners.get(0));
        } else {
            throw new IllegalStateException("No Assistant Commissioner found.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        return reportRepo.save(report);
    }

    @Transactional
    public Report sendCasePlanToDirectorInvestigation(Integer reportId, String employeeId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee sender = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Check if sender is the investigation officer or has permission
        if (report.getInvestigationOfficer() == null ||
                (!report.getInvestigationOfficer().getEmployeeId().equals(employeeId) &&
                        !isDirectorIntelligence(employeeId))) {
            throw new RuntimeException("You are not authorized to send case plan");
        }

        // Verify case plan exists
        if ((report.getCasePlan() == null || report.getCasePlan().trim().isEmpty()) &&
                (report.getCasePlanDescription() == null || report.getCasePlanDescription().trim().isEmpty()) &&
                (report.getFindingsAttachmentPaths() == null || report.getFindingsAttachmentPaths().isEmpty())) {
            throw new RuntimeException("No case plan details or attachments found to send");
        }

        // Update case status
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION);
        caseRepo.save(relatedCase);

        // Set recipient - Director of Investigation
        Employee recipient = report.getDirectorInvestigation();
        if (recipient == null) {
            List<Employee> directors = reportRepo.DirectorsOfInvestigation();
            if (!directors.isEmpty()) recipient = directors.get(0);
        }

        if (recipient != null) {
            report.setCurrentRecipient(recipient);
        } else {
            throw new IllegalStateException("No Director of Investigation found to receive this case plan.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION,
                "Case plan sent to Director of Investigation for report #" + savedReport.getId() +
                        " by " + employeeId,
                sender);

        // Create notification
        String message = String.format("Case plan sent for report #%d by %s %s",
                savedReport.getId(),
                sender.getGivenName(),
                sender.getFamilyName());
        createNotification(savedReport, message);

        // Send websocket notification
        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION");
        webSocketNotificationService.sendNotificationToDirectorsInvestigation(broadcastNotification);

        return savedReport;
    }

    private void validateCasePlanAttachment(MultipartFile file) {
        if (file == null || file.isEmpty())
            return;

        // Validate file size
        if (file.getSize() > maxFileSize) {
            throw new RuntimeException("File size exceeds maximum limit of " + maxFileSize + " bytes");
        }

        // Validate file type - allow PDF and Word documents for case plans
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String lowerFilename = originalFilename.toLowerCase();

        if (!lowerFilename.endsWith(".pdf") &&
                !lowerFilename.endsWith(".doc") &&
                !lowerFilename.endsWith(".docx") &&
                !lowerFilename.endsWith(".xls") &&
                !lowerFilename.endsWith(".xlsx") &&
                !lowerFilename.endsWith(".png") &&
                !lowerFilename.endsWith(".jpg") &&
                !lowerFilename.endsWith(".jpeg")) {
            throw new RuntimeException("Only PDF, Word (.doc, .docx), Excel (.xls, .xlsx), and Images (.png, .jpg, .jpeg) are allowed for case plans");
        }
    }

    private String storeCasePlanAttachment(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty())
            return null;

        String storedPath = null;
        try {
            storedPath = fileStorageService.store(file, "case-plans", CASE_PLAN_ATTACHMENT_EXTENSIONS);
            verifyStoredFile(fileStorageService.resolveStoredPath(storedPath), file.getSize());
            return storedPath;

        } catch (IOException e) {
            cleanupStoredFile(storedPath);
            throw new IOException("Failed to store case plan file: " + e.getMessage(), e);
        }
    }

    private boolean isDirectorIntelligence(String employeeId) {
        List<Employee> directors = reportRepo.DirectorsOfIntelligence();
        return directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));
    }

    public List<Report> getCasePlansForDirectorInvestigation(String directorId) {
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(directorId));

        if (!isDirector) {
            throw new RuntimeException("Employee is not a Director of Investigation");
        }

        return reportRepo.findCasePlansForDirectorInvestigation(
                WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION,
                directorId);
    }

    @Transactional
    public Report approveCasePlan(Integer reportId, String approverId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee approver = employeeRepo.findByEmployeeId(approverId)
                .orElseThrow(() -> new RuntimeException("Approver not found"));

        // Verify the approver is a Director of Investigation
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(approverId));

        if (!isDirector) {
            throw new RuntimeException("Only Director of Investigation can approve case plans");
        }

        Case relatedCase = report.getRelatedCase();
        if (relatedCase == null || relatedCase.getStatus() != WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION) {
            throw new IllegalStateException("Case plan not in correct status for Director Investigation approval");
        }

        // Update case status
        relatedCase.setStatus(WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION);
        caseRepo.save(relatedCase);

        report.setDirectorInvestigation(approver);
        report.setApprovedBy(approver);
        report.setApprovedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());

        // Send back to investigation officer so they can continue working
        if (report.getInvestigationOfficer() != null) {
            report.setCurrentRecipient(report.getInvestigationOfficer());
        }

        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION,
                "Case plan approved for report #" + savedReport.getId() + " by Director of Investigation " + approverId,
                approver);

        // Create notification
        String message = String.format("Case plan for report #%d has been approved. You can now proceed with the investigation.",
                savedReport.getId());
        createNotification(savedReport, message);

        // Send websocket notification to investigation officer
        if (report.getInvestigationOfficer() != null) {
            NotificationDTO notificationDTO = webSocketNotificationService
                    .createNotificationDTO(savedReport, message, report.getInvestigationOfficer());
            notificationDTO.setNotificationType("CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION");
            webSocketNotificationService.sendNotificationToUser(
                    report.getInvestigationOfficer().getEmployeeId(),
                    notificationDTO);
        }

        return savedReport;
    }

    @Transactional
    public Report rejectCasePlan(Integer reportId, String rejectionReason, String rejectorId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee rejector = employeeRepo.findByEmployeeId(rejectorId)
                .orElseThrow(() -> new RuntimeException("Rejector not found"));

        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(rejectorId));

        if (!isDirector) {
            throw new RuntimeException("Only Director of Investigation can reject case plans");
        }

        Case relatedCase = report.getRelatedCase();
        if (relatedCase == null || relatedCase.getStatus() != WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION) {
            throw new IllegalStateException("Case plan not in correct status for Director Investigation rejection");
        }

        relatedCase.setStatus(WorkflowStatus.CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION);
        caseRepo.save(relatedCase);

        report.setDirectorInvestigation(rejector);
        report.setRejectedBy(rejector);
        report.setRejectionReason(rejectionReason);
        report.setRejectedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());

        // Return to investigation officer for revision
        if (report.getInvestigationOfficer() != null) {
            report.setCurrentRecipient(report.getInvestigationOfficer());
            report.setReturnedBy(rejector);
            report.setReturnReason(rejectionReason);
            report.setReturnedAt(LocalDateTime.now());
        }

        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION,
                "Case plan rejected for report #" + savedReport.getId() + " by Director of Investigation " +
                        rejectorId + ". Reason: " + rejectionReason,
                rejector);

        // Create notification
        String message = String.format(
                "Case plan for report #%d has been rejected by Director of Investigation %s %s. Reason: %s",
                savedReport.getId(),
                rejector.getGivenName(),
                rejector.getFamilyName(),
                rejectionReason);
        createNotification(savedReport, message);

        // Send websocket notification to investigation officer
        if (report.getInvestigationOfficer() != null) {
            NotificationDTO broadcastNotification = webSocketNotificationService
                    .createNotificationDTO(savedReport, message, report.getInvestigationOfficer());
            broadcastNotification.setNotificationType("CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION");
            webSocketNotificationService.sendNotificationToUser(
                    report.getInvestigationOfficer().getEmployeeId(),
                    broadcastNotification);
        }

        return savedReport;
    }

    @Transactional
    public Report approveInvestigationReport(Integer reportId, String approverId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee approver = employeeRepo.findByEmployeeId(approverId)
                .orElseThrow(() -> new RuntimeException("Approver not found"));

        // Verify approver is Director of Investigation
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(approverId));

        if (!isDirector) {
            throw new RuntimeException("Only Director of Investigation can approve investigation reports");
        }

        // Verify report is in correct status
        if (report.getRelatedCase().getStatus() != WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION) {
            throw new RuntimeException("Investigation report not in correct status for approval");
        }

        // Update case status
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION);
        caseRepo.save(relatedCase);

        report.setDirectorInvestigation(approver);
        // FIXED: Store approver ID instead of stringified Employee object
        report.setInvestigationReportApprovedBy(approverId);
        report.setInvestigationReportApprovedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());

        // Set next recipient - Assistant Commissioner
        List<Employee> commissioners = reportRepo.assistantCommissioner();
        if (!commissioners.isEmpty()) {
            report.setCurrentRecipient(commissioners.get(0));
            report.setAssistantCommissioner(commissioners.get(0));
        }

        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION,
                "Investigation report approved for report #" + savedReport.getId() +
                        " by Director of Investigation " + approverId,
                approver);

        // Create notification
        String message = String.format(
                "Investigation report for case #%s has been approved by Director of Investigation %s %s",
                report.getRelatedCase().getCaseNum(),
                approver.getGivenName(),
                approver.getFamilyName());
        createNotification(savedReport, message);

        // Send websocket notification
        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("INVESTIGATION_REPORT_APPROVED");
        webSocketNotificationService.sendNotificationToAssistantCommissioners(broadcastNotification);

        return savedReport;
    }

    @Transactional
    public Report rejectInvestigationReport(Integer reportId, String rejectionReason, String rejectorId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee rejector = employeeRepo.findByEmployeeId(rejectorId)
                .orElseThrow(() -> new RuntimeException("Rejector not found"));

        Case relatedCase = report.getRelatedCase();
        if (relatedCase == null || relatedCase.getStatus() != WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION) {
            throw new IllegalStateException(
                    "Investigation report not in correct status for rejection");
        }

        WorkflowStatus newStatus = WorkflowStatus.INVESTIGATION_REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION;
        report.setDirectorInvestigation(rejector);
        report.setInvestigationReportRejectedBy(rejectorId);
        report.setInvestigationReportRejectionReason(rejectionReason);
        report.setInvestigationReportRejectedAt(LocalDateTime.now());

        // Return to investigation officer
        if (report.getInvestigationOfficer() != null) {
            report.setCurrentRecipient(report.getInvestigationOfficer());
        } else {
            report.setCurrentRecipient(report.getCreatedBy());
        }

        relatedCase.setStatus(newStatus);
        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);

        String message = String.format("Your report #%d has been rejected by %s %s. Reason: %s",
                savedReport.getId(),
                rejector.getGivenName(),
                rejector.getFamilyName(),
                rejectionReason != null ? rejectionReason : "No reason provided");
        createNotification(savedReport, message);
        auditService.logAction(
                newStatus,
                "Report " + savedReport.getId() + " rejected by " + rejector.getEmployeeId() +
                        (rejectionReason != null ? ". Reason: " + rejectionReason : ""),
                rejector);
        return savedReport;
    }

    @Transactional
    public Report returnInvestigationReport(Integer reportId, String returnReason, String returnerId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee returner = employeeRepo.findByEmployeeId(returnerId)
                .orElseThrow(() -> new RuntimeException("Returner not found"));

        // Verify returner is Director of Investigation
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(returnerId));

        if (!isDirector) {
            throw new RuntimeException("Only Director of Investigation can return investigation reports");
        }

        Case relatedCase = report.getRelatedCase();
        if (relatedCase == null || relatedCase.getStatus() != WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION) {
            throw new IllegalStateException("Investigation report not in correct status for return");
        }

        relatedCase.setStatus(WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER);
        caseRepo.save(relatedCase);

        // Return to investigation officer for revision
        if (report.getInvestigationOfficer() != null) {
            report.setCurrentRecipient(report.getInvestigationOfficer());
            report.setReturnedBy(returner);
            report.setReturnReason(returnReason);
            report.setReturnedAt(LocalDateTime.now());
            report.setUpdatedAt(LocalDateTime.now());
        }

        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER,
                "Investigation report returned for revision for report #" + savedReport.getId() +
                        " by Director of Investigation " + returnerId +
                        ". Reason: " + returnReason,
                returner);

        // Create notification
        String message = String.format("Investigation report for case #%s has been returned for revision. Reason: %s",
                report.getRelatedCase().getCaseNum(),
                returnReason);
        createNotification(savedReport, message);

        // Send websocket notification to investigation officer
        if (report.getInvestigationOfficer() != null) {
            NotificationDTO broadcastNotification = webSocketNotificationService
                    .createNotificationDTO(savedReport, message, report.getInvestigationOfficer());
            broadcastNotification.setNotificationType("INVESTIGATION_REPORT_RETURNED");
            webSocketNotificationService.sendNotificationToUser(
                    report.getInvestigationOfficer().getEmployeeId(),
                    broadcastNotification);
        }

        return savedReport;
    }
    @Transactional
    public Report approveCasePlanByAssistantCommissioner(Integer reportId, String approverId) {
        validateAssistantCommissioner(approverId);
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee approver = employeeRepo.findByEmployeeId(approverId)
                .orElseThrow(() -> new RuntimeException("Approver not found"));

        if (report.getRelatedCase().getStatus() != WorkflowStatus.CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER) {
            throw new RuntimeException("Case plan not in correct status for AC approval");
        }

        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER);
        caseRepo.save(relatedCase);

        report.setAssistantCommissioner(approver);
        report.setApprovedBy(approver);
        report.setApprovedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());

        // Send back to investigation officer
        if (report.getInvestigationOfficer() != null) {
            report.setCurrentRecipient(report.getInvestigationOfficer());
        }

        Report savedReport = reportRepo.save(report);

        String message = "Your case plan # " + report.getId() + " has been approved by the Assistant Commissioner.";
        createNotification(savedReport, message);
        auditService.logAction(
                WorkflowStatus.CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER,
                "Case plan approved for report #" + savedReport.getId() + " by Assistant Commissioner " + approverId,
                approver);

        return savedReport;
    }

    @Transactional
    public Report rejectCasePlanByAssistantCommissioner(Integer reportId, String reason, String rejectorId) {
        validateAssistantCommissioner(rejectorId);
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee rejector = employeeRepo.findByEmployeeId(rejectorId)
                .orElseThrow(() -> new RuntimeException("Rejector not found"));

        Case relatedCase = report.getRelatedCase();
        if (relatedCase == null || relatedCase.getStatus() != WorkflowStatus.CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER) {
            throw new RuntimeException("Case plan not in correct status for AC rejection");
        }

        relatedCase.setStatus(WorkflowStatus.CASE_PLAN_REJECTED_BY_ASSISTANT_COMMISSIONER);
        caseRepo.save(relatedCase);

        report.setAssistantCommissioner(rejector);
        report.setRejectedBy(rejector);
        report.setRejectionReason(reason);
        report.setRejectedAt(LocalDateTime.now());
        report.setReturnedBy(rejector);
        report.setReturnReason(reason);
        report.setReturnedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());

        // Return to investigation officer
        if (report.getInvestigationOfficer() != null) {
            report.setCurrentRecipient(report.getInvestigationOfficer());
        }

        Report savedReport = reportRepo.save(report);

        String message = "Your case plan # " + report.getId() + " has been rejected by the Assistant Commissioner. Reason: " + reason;
        createNotification(savedReport, message);
        auditService.logAction(
                WorkflowStatus.CASE_PLAN_REJECTED_BY_ASSISTANT_COMMISSIONER,
                "Case plan rejected for report #" + savedReport.getId() + " by Assistant Commissioner "
                        + rejectorId + ". Reason: " + reason,
                rejector);

        return savedReport;
    }


    public List<Report> getCasePlansForAssistantCommissioner(String employeeId) {
        validateAssistantCommissioner(employeeId);
        return reportRepo.findCasePlansForAssistantCommissioner(
                WorkflowStatus.CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER,
                employeeId
        );
    }

    @Transactional(readOnly = true)
    public PageResponseDTO<ReportResponseDTO> getCasePlanPageForAssistantCommissioner(
            String employeeId,
            int requestedPage,
            int requestedSize,
            String search) {
        String normalizedSearch = normalizeSearch(search);

        List<ReportResponseDTO> rows = getCasePlansForAssistantCommissioner(employeeId).stream()
                .map(this::toResponseDTO)
                .filter(report -> matchesReportSearch(report, normalizedSearch))
                .sorted((left, right) -> Comparator.nullsLast(LocalDateTime::compareTo)
                        .compare(right.getCreatedAt(), left.getCreatedAt()))
                .toList();

        return toPageResponse(rows, requestedPage, requestedSize);
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
    }
}
