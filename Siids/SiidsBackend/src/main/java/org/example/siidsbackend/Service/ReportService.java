package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.*;
import org.example.siidsbackend.DTO.Request.FindingsRequestDTO;
import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.file.attribute.PosixFilePermission;
import java.util.*;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {
    private final ReportRepo reportRepo;
    private final EmployeeRepo employeeRepo;
    private final CaseRepo caseRepo;
    private final NotificationRepo notificationRepo;
    private final StructureRepository structureRepo;
    private final WebSocketNotificationService webSocketNotificationService;
    private final AuditService auditService;

    @Value("${file.upload-dir}")
    private String uploadDir;

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
                creator
        );

        return savedReport;
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
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        } else {
            throw new IllegalStateException("No Director of Investigation found.");
        }

        Report savedReport = reportRepo.save(report);

        // Log the action
        auditService.logAction(
                WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION,
                "Investigation findings submitted for report #" + savedReport.getId() +
                        " by officer " + officerId +
                        " with " + attachmentPaths.size() + " attachments",
                report.getInvestigationOfficer()
        );

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
        if (file == null || file.isEmpty()) return null;

        // Validate file type
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String lowerFilename = originalFilename.toLowerCase();

        // Allow more file types for findings (PDF, images, documents)
        if (!lowerFilename.endsWith(".pdf") &&
                !lowerFilename.endsWith(".jpg") && !lowerFilename.endsWith(".jpeg") &&
                !lowerFilename.endsWith(".png") &&
                !lowerFilename.endsWith(".doc") && !lowerFilename.endsWith(".docx") &&
                !lowerFilename.endsWith(".xls") && !lowerFilename.endsWith(".xlsx")) {
            throw new Exception("Only PDF, images (JPG, PNG), and documents (DOC, DOCX, XLS, XLSX) are allowed");
        }

        // Validate file size
        if (file.getSize() > maxFileSize) {
            throw new Exception("File size exceeds maximum limit of " + maxFileSize + " bytes");
        }

        // Create findings-attachments subdirectory
        Path uploadPath = Paths.get(uploadDir).resolve("findings-attachments").toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            try {
                Files.setPosixFilePermissions(uploadPath,
                        Set.of(PosixFilePermission.OWNER_READ,
                                PosixFilePermission.OWNER_WRITE,
                                PosixFilePermission.OWNER_EXECUTE));
            } catch (UnsupportedOperationException e) {
                log.warn("Unable to set POSIX permissions on Windows");
            }
        }

        // Generate secure filename
        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        String secureFilename = UUID.randomUUID().toString() + fileExtension;

        Path filePath = uploadPath.resolve(secureFilename);

        // Security check: prevent path traversal
        if (!filePath.normalize().startsWith(uploadPath)) {
            throw new IOException("Invalid file path - security violation");
        }

        try {
            // Store the file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Verify file was written correctly
            if (!Files.exists(filePath) || Files.size(filePath) != file.getSize()) {
                throw new IOException("File storage verification failed");
            }

            // Additional validation for certain file types
            if (lowerFilename.endsWith(".pdf")) {
                verifyStoredPdf(filePath);
            } else if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) {
                verifyImageFile(filePath, "jpg");
            } else if (lowerFilename.endsWith(".png")) {
                verifyImageFile(filePath, "png");
            }

            return "findings-attachments/" + secureFilename;

        } catch (IOException e) {
            // Clean up failed file if it exists
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException cleanupException) {
                log.error("Failed to cleanup corrupted file: {}", cleanupException.getMessage());
            }
            throw new IOException("Failed to store findings attachment: " + e.getMessage(), e);
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
                byte[] pngSignature = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
                for (int i = 0; i < 8; i++) {
                    if (header[i] != pngSignature[i]) {
                        throw new IOException("Invalid PNG file format");
                    }
                }
            }
        }
    }
    private boolean canSubmitFindings(Report report) {
        WorkflowStatus currentStatus = report.getRelatedCase().getStatus();

        // Allowed statuses for submitting findings
        return currentStatus == WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER ||
                currentStatus == WorkflowStatus.INVESTIGATION_IN_PROGRESS ||
                currentStatus == WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION ||
                currentStatus == WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER ||
                currentStatus == WorkflowStatus.INVESTIGATION_COMPLETED;
    }

    private String storeAttachment(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) return null;

        // Validate file type
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (!originalFilename.toLowerCase().endsWith(".pdf")) {
            throw new Exception("Only PDF files are allowed");
        }

        // Validate file size
        if (file.getSize() > maxFileSize) {
            throw new Exception("File size exceeds maximum limit of " + maxFileSize + " bytes");
        }

        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            try {
                Files.setPosixFilePermissions(uploadPath,
                        Set.of(PosixFilePermission.OWNER_READ,
                                PosixFilePermission.OWNER_WRITE,
                                PosixFilePermission.OWNER_EXECUTE));
            } catch (UnsupportedOperationException e) {
                log.warn("Unable to set POSIX permissions on Windows");
            }
        }

        // Generate secure filename
        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        String secureFilename = UUID.randomUUID().toString() + fileExtension;

        Path filePath = uploadPath.resolve(secureFilename);

        // Security check: prevent path traversal
        if (!filePath.normalize().startsWith(uploadPath)) {
            throw new IOException("Invalid file path - security violation");
        }

        try {
            // Store the file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Verify file was written correctly
            if (!Files.exists(filePath) || Files.size(filePath) != file.getSize()) {
                throw new IOException("File storage verification failed");
            }

            // Verify PDF integrity
            verifyStoredPdf(filePath);

            return secureFilename;

        } catch (IOException e) {
            // Clean up failed file if it exists
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException cleanupException) {
                log.error("Failed to cleanup corrupted file: {}", cleanupException.getMessage());
            }
            throw new IOException("Failed to store PDF file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public Report sendToDirectorIntelligence(Integer reportId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        List<Employee> directors = reportRepo.DirectorsOfIntelligence();

        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE);
        caseRepo.save(relatedCase);

        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        } else {
            throw new IllegalStateException("No Director of Intelligence found.");
        }

        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE,
                "Report #" + savedReport.getId() + " sent to Director of Intelligence",
                report.getCreatedBy()
        );

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
                report.getCreatedBy()
        );

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
                report.getCreatedBy()
        );

        return savedReport;
    }

    @Transactional
    public Report returnReport(Integer reportId, String returnReason, String returnToEmployeeId, String returnerId) throws IOException {
        return returnReport(reportId, returnReason, returnToEmployeeId, returnerId, null);
    }

    @Transactional
    public Report returnReport(Integer reportId, String returnReason, String returnToEmployeeId, String returnerId, MultipartFile returnDocument) throws IOException {
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
        switch(report.getRelatedCase().getStatus()) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_SUBMITTED:
                newStatus = WorkflowStatus.REPORT_RETURNED_TO_INTELLIGENCE_OFFICER;
                break;
            case REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION:
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE;
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
                returner
        );
        return savedReport;
    }

    // NEW METHOD: Store return document
    private String storeReturnDocument(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;

        // Validate file type
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String lowerFilename = originalFilename.toLowerCase();

        if (!lowerFilename.endsWith(".doc") && !lowerFilename.endsWith(".docx") && !lowerFilename.endsWith(".pdf")) {
            throw new IOException("Only DOC, DOCX, and PDF files are allowed for return documents");
        }

        // Create return documents directory
        Path returnDocsDir = Paths.get(uploadDir).resolve("return-documents").toAbsolutePath().normalize();
        if (!Files.exists(returnDocsDir)) {
            Files.createDirectories(returnDocsDir);
        }

        // Generate secure filename
        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        String secureFilename = UUID.randomUUID().toString() + fileExtension;

        Path filePath = returnDocsDir.resolve(secureFilename);

        // Security check
        if (!filePath.normalize().startsWith(returnDocsDir)) {
            throw new IOException("Invalid file path - security violation");
        }

        // Store the file
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return "return-documents/" + secureFilename;
    }

    private void createNotification(Report report, String message) {
        if (report.getCurrentRecipient() != null) {
            Notification notification = new Notification();
            notification.setMessage(message);
            notification.setRecipient(report.getCurrentRecipient());
            notification.setReport(report);
            notification.setCreatedAt(LocalDateTime.now());
            notification.setRead(false);
            notificationRepo.save(notification);

            NotificationDTO notificationDTO = webSocketNotificationService
                    .createNotificationDTO(report, message, report.getCurrentRecipient());
            notificationDTO.setNotificationType(getNotificationType(report.getRelatedCase().getStatus()));

            webSocketNotificationService.sendNotificationToUser(
                    report.getCurrentRecipient().getEmployeeId(),
                    notificationDTO
            );
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
                return "REPORT_RETURNED";
            case INVESTIGATION_IN_PROGRESS:
                return "INVESTIGATION_IN_PROGRESS";
            case INVESTIGATION_COMPLETED:
                return "INVESTIGATION_COMPLETED";
            case INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION:
                return "INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION";
            case REPORT_RETURNED_TO_INVESTIGATION_OFFICER:
                return "REPORT_RETURNED_FROM_LEGAL";
            default:
                return "GENERAL_NOTIFICATION";
        }
    }

    public Report getReport(Integer id) {
        return reportRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found"));
    }

    public ReportResponseDTO toResponseDTO(Report report) {
        ReportResponseDTO dto = new ReportResponseDTO();
        dto.setId(report.getId());
        dto.setDescription(report.getDescription());

        if (report.getAttachmentPaths() != null && !report.getAttachmentPaths().isEmpty()) {
            dto.setAttachmentPaths(report.getAttachmentPaths());
        } else if (report.getAttachmentPath() != null) {
            dto.setAttachmentPaths(List.of(report.getAttachmentPath()));
        } else {
            dto.setAttachmentPaths(new ArrayList<>());
        }
        dto.setAssignmentNotes(report.getAssignmentNotes());
        dto.setStatus(report.getRelatedCase() != null ? report.getRelatedCase().getStatus() : null);
        dto.setCreatedBy(report.getCreatedBy().getGivenName() + " " + report.getCreatedBy().getFamilyName());
        dto.setCurrentRecipient(report.getCurrentRecipient() != null ?
                report.getCurrentRecipient().getGivenName() + " " + report.getCurrentRecipient().getFamilyName() : null);
        dto.setCreatedAt(report.getCreatedAt());
        dto.setUpdatedAt(report.getUpdatedAt());
        dto.setCreatedByEmployeeId(report.getCreatedBy().getEmployeeId());
        dto.setRelatedCase(report.getRelatedCase());
        dto.setPrincipleAmount(report.getPrincipleAmount());
        dto.setPenaltiesAmount(report.getPenaltiesAmount());
        dto.setFindings(report.getFindings());
        dto.setRecommendations(report.getRecommendations());
        dto.setFindingsAttachmentPaths(report.getFindingsAttachmentPaths());

        if (report.getRelatedCase() != null && report.getRelatedCase().getInformerId() != null) {
            dto.setInformer(convertToInformerDTO(report.getRelatedCase().getInformerId()));
        }
        return dto;
    }
    private InformerDTO convertToInformerDTO(Informer informer) {
        if (informer == null) return null;

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

    public List<Report> getReportsForDirectorIntelligence(String directorId) {
        List<Employee> directors = reportRepo.DirectorsOfIntelligence();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(directorId));

        if (!isDirector) {
            throw new RuntimeException("Employee is not a Director of Intelligence");
        }

        return reportRepo.findReportsSubmittedToDirectorIntelligence(directorId);
    }

    @Transactional
    public Report approveReport(Integer reportId, String approverId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee approver = employeeRepo.findByEmployeeId(approverId)
                .orElseThrow(() -> new RuntimeException("Approver not found"));

        Case relatedCase = report.getRelatedCase();
        WorkflowStatus newStatus;

        switch(relatedCase.getStatus()) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_SUBMITTED:
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE;
                report.setDirectorIntelligence(approver);

                List<Employee> commissioners = reportRepo.assistantCommissioner();
                if (!commissioners.isEmpty()) {
                    report.setCurrentRecipient(commissioners.get(0));
                }
                break;

            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER;
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
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER;
                report.setAssistantCommissioner(approver);

                List<Employee> investigationDirectors = reportRepo.DirectorsOfInvestigation();
                if (!investigationDirectors.isEmpty()) {
                    report.setCurrentRecipient(investigationDirectors.get(0));
                }
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
                approver
        );

        return savedReport;
    }

    @Transactional
    public Report rejectReport(Integer reportId, String rejectionReason, String rejectorId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee rejector = employeeRepo.findByEmployeeId(rejectorId)
                .orElseThrow(() -> new RuntimeException("Rejector not found"));

        WorkflowStatus newStatus;
        switch(report.getRelatedCase().getStatus()) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE;
                report.setDirectorIntelligence(rejector);
                break;
            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION;
                report.setDirectorInvestigation(rejector);
                break;
            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER;
                report.setAssistantCommissioner(rejector);
                break;
            default:
                throw new IllegalStateException("Cannot reject report in current status: " + report.getRelatedCase().getStatus());
        }

        report.getRelatedCase().setStatus(newStatus);
        report.setRejectedBy(rejector);
        report.setRejectionReason(rejectionReason);
        report.setRejectedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());
        report.setCurrentRecipient(report.getCreatedBy());

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
                rejector
        );
        return savedReport;
    }

    public List<Report> getApprovedReportsForAssistantCommissioner(String employeeId) {
        List<Employee> assistantCommissioners = reportRepo.assistantCommissioner();
        boolean isAssistantCommissioner = assistantCommissioners.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));

        if (!isAssistantCommissioner) {
            throw new RuntimeException("Employee is not an Assistant Commissioner");
        }

        return reportRepo.findByRelatedCaseStatus(WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE);
    }

    public List<Report> getReportsApprovedByAssistantCommissionerForDirectorInvestigation(String directorId) {
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(directorId));

        if (!isDirector) {
            throw new RuntimeException("Employee is not a Director of Investigation");
        }

        return reportRepo.findByRelatedCaseStatus(WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER);
    }

    @Transactional
    public Report assignToInvestigationOfficer(Integer reportId, String specificOfficerId, String assignmentNotes) {
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
        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);

        String message = String.format("Investigation report #%d has been assigned to you for investigation by %s %s. Instructions: %s",
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
                notificationDTO
        );
        auditService.logAction(
                WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER,
                "Report #" + savedReport.getId() + " assigned to investigation officer " +
                        assignedOfficer.getEmployeeId() + " with notes: " + assignmentNotes,
                report.getCurrentRecipient()
        );

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
            throw new RuntimeException("Employee is not a Director of Investigation");
        }

        return reportRepo.findReportsHandledByDirectorInvestigation();
    }

    public ResponseEntity<Resource> downloadAttachment(String filename) {
        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(filename).normalize();

            if (!filePath.startsWith(uploadPath)) {
                throw new RuntimeException("Invalid file path");
            }

            if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
                throw new RuntimeException("File not found or not readable: " + filename);
            }

            Resource resource = new UrlResource(filePath.toUri());

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/pdf";
            }

            String originalFilename = filename;
            if (filename.contains("_")) {
                originalFilename = filename.substring(filename.indexOf("_") + 1);
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + originalFilename + "\"")
                    .body(resource);

        } catch (Exception e) {
            throw new RuntimeException("Error downloading file: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> getFileInfo(String filename) {
        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(filename).normalize();

            if (!filePath.startsWith(uploadPath)) {
                throw new RuntimeException("Invalid file path");
            }

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
        try {
            Report report = reportRepo.findById(reportId)
                    .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

            Employee requester = employeeRepo.findByEmployeeId(requesterId)
                    .orElseThrow(() -> new RuntimeException("Requester not found"));

            if (!hasAccessToReport(report, requester)) {
                throw new RuntimeException("Access denied to this report");
            }

            boolean isValidAttachment = false;

            // Check single attachment path
            if (report.getAttachmentPath() != null && report.getAttachmentPath().equals(filename)) {
                isValidAttachment = true;
            }

            // Check multiple attachment paths
            if (report.getAttachmentPaths() != null && report.getAttachmentPaths().contains(filename)) {
                isValidAttachment = true;
            }

            // Check findings attachments
            if (report.getFindingsAttachmentPaths() != null &&
                    report.getFindingsAttachmentPaths().contains(filename)) {
                isValidAttachment = true;
            }

            if (!isValidAttachment) {
                throw new RuntimeException("Attachment not found in this report");
            }
            auditService.logAction(
                    WorkflowStatus.ATTACHMENT_DOWNLOADED,
                    "Attachment '" + filename + "' downloaded from report #" + reportId + " by " + requesterId,
                    requester
            );

            return downloadAttachment(filename);

        } catch (Exception e) {
            throw new RuntimeException("Error downloading report attachment: " + e.getMessage(), e);
        }
    }

    private boolean hasAccessToReport(Report report, Employee employee) {
        if (report.getCreatedBy().getEmployeeId().equals(employee.getEmployeeId())) {
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
        List<Employee> directors = reportRepo.DirectorsOfIntelligence();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(directorId));

        if (!isDirector) {
            throw new RuntimeException("Employee is not a Director of Intelligence");
        }
        return reportRepo.findReportsHandledByDirectorIntelligence();
    }

    public List<Report> getReportsHandledByAssistantCommissioner(String employeeId) {
        List<Employee> assistantCommissioners = reportRepo.assistantCommissioner();
        boolean isAssistantCommissioner = assistantCommissioners.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));

        if (!isAssistantCommissioner) {
            throw new RuntimeException("Employee is not an Assistant Commissioner");
        }

        return reportRepo.findReportsHandledAssistantCommissioner();
    }

    public List<Report> getReportsHandledByDirectorInvestigation(String directorId) {
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(directorId));

        if (!isDirector) {
            throw new RuntimeException("Employee is not a Director of Investigation");
        }

        return reportRepo.findReportsHandledByDirectorInvestigation();
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

        WorkflowStatus newStatus;
        switch(report.getRelatedCase().getStatus()) {
            case REPORT_RETURNED_TO_INTELLIGENCE_OFFICER:
                newStatus = WorkflowStatus.REPORT_SUBMITTED;
                break;
            case REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION;
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
        }

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                newStatus,
                "Returned report #" + savedReport.getId() + " updated and resubmitted by " +
                        savedReport.getCreatedBy().getEmployeeId(),
                savedReport.getCreatedBy()
        );

        String message = String.format("Returned report #%d has been updated and resubmitted by %s %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName());
        createNotification(savedReport, message);

        return savedReport;
    }

    private boolean isReportReturned(Report report) {
        return report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_INTELLIGENCE_OFFICER ||
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION;
    }

    public FinesReportDTO generateFinesReportForAssistantCommissioner(String employeeId) {
        // Verify the employee is an assistant commissioner
        List<Employee> assistantCommissioners = reportRepo.assistantCommissioner();
        boolean isAssistantCommissioner = assistantCommissioners.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));

        if (!isAssistantCommissioner) {
            throw new RuntimeException("Employee is not an Assistant Commissioner");
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
        double avgPrinciple = reportsWithFines.isEmpty() ? 0 : totalPrinciple / reportsWithFines.size();
        double avgPenalties = reportsWithFines.isEmpty() ? 0 : totalPenalties / reportsWithFines.size();

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

    public List<DirectorIntelligenceReportDTO> getDirectorIntelligenceReport(String directorId) {
        // Verify the employee is a Director of Intelligence
        List<Employee> directors = reportRepo.DirectorsOfIntelligence();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(directorId));

        if (!isDirector) {
            throw new RuntimeException("Employee is not a Director of Intelligence");
        }

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

    public List<Report> getReportsAssignedToInvestigationOfficer(String officerId) {
        List<Employee> officers = reportRepo.findAvailableT3Officers();
        boolean isValidOfficer = officers.stream()
                .anyMatch(officer -> officer.getEmployeeId().equals(officerId));

        if (!isValidOfficer) {
            throw new RuntimeException("Employee is not a T3 Investigation Officer");
        }

        // Define statuses where investigation officer should still have access
        List<WorkflowStatus> activeStatuses = Arrays.asList(
                WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER,
                WorkflowStatus.INVESTIGATION_IN_PROGRESS,
                WorkflowStatus.CASE_PLAN_SUBMITTED,
                WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION,
                WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION,
                WorkflowStatus.CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION,
                WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER,
                WorkflowStatus.INVESTIGATION_COMPLETED,
                WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION
        );

        return reportRepo.findActiveReportsForInvestigationOfficer(officerId, activeStatuses);
    }
    public List<Report> getReportsAssignedToInvestigationOfficers(String officerId) {
        List<Employee> t3Officers = reportRepo.findAvailableT3Officers();
        boolean isT3Officer = t3Officers.stream()
                .anyMatch(o -> o.getEmployeeId().equals(officerId));

        if (!isT3Officer) {
            throw new RuntimeException("Employee is not a T3 Investigation Officer");
        }

        return reportRepo.findReportsAssignedToInvestigationOfficer(officerId);
    }
    public List<Report> getHistoricalReportsForInvestigationOfficer(String officerId) {
        List<Employee> officers = reportRepo.findAvailableT3Officers();
        boolean isValidOfficer = officers.stream()
                .anyMatch(officer -> officer.getEmployeeId().equals(officerId));

        if (!isValidOfficer) {
            throw new RuntimeException("Employee is not a T3 Investigation Officer");
        }

        return reportRepo.findReportsByInvestigationOfficer(officerId);
    }
    public List<Report> getAllReportsForInvestigationOfficer(String officerId) {
        List<Employee> officers = reportRepo.findAvailableT3Officers();
        boolean isValidOfficer = officers.stream()
                .anyMatch(officer -> officer.getEmployeeId().equals(officerId));

        if (!isValidOfficer) {
            throw new RuntimeException("Employee is not a T3 Investigation Officer");
        }

        return reportRepo.findReportsByInvestigationOfficer(officerId);
    }

    @Transactional
    public void sendReportToDepartment(Integer id, String department) {
        log.info("Received department: '{}' for report ID: {}", department, id);
        Report report = getReport(id);

        String normalizedDept = department.trim();
        Map<String, WorkflowStatus> deptWorkflowMap = Map.of(
                "Legal Services and Board Affairs", WorkflowStatus.REPORT_SENT_TO_LEGAL_SERVICES_AND_BOARD_AFFAIRS,
                "Customs Services", WorkflowStatus.REPORT_SENT_TO_CUSTOMS_SERVICES,
                "Finance", WorkflowStatus.REPORT_SENT_TO_FINANCE,
                "Strategy and Risk Analysis", WorkflowStatus.REPORT_SENT_TO_STRATEGIC_AND_RISK_ANALYSIS,
                "Internal Audit and Integrity", WorkflowStatus.REPORT_SENT_TO_INTERNAL_AUDIT_AND_INTEGRITY,
                "IT and Digital Transformation", WorkflowStatus.REPORT_SENT_TO_IT_AND_DIGITAL_TRANSFORMATION
        );
        List<structures> departments = structureRepo.findByStructureType("department");
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
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        List<Employee> legalAdvisors = reportRepo.findLegalAdvisors();

        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM);
        caseRepo.save(relatedCase);

        if (!legalAdvisors.isEmpty()) {
            report.setCurrentRecipient(legalAdvisors.get(0));
        } else {
            throw new IllegalStateException("No Legal Advisor found.");
        }

        report.setUpdatedAt(LocalDateTime.now());

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM,
                "Report #" + savedReport.getId() + " sent to Legal Advisor",
                report.getCreatedBy()
        );

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
            throw new RuntimeException("Employee is not a Legal Advisor");
        }

        return reportRepo.findReportsAssignedToLegalAdvisor(legalAdvisorId);
    }

    public List<Report> getAllReportsWithLegalAdvisors() {
        return reportRepo.findReportsWithLegalAdvisors();
    }

    @Transactional
    public Report returnToInvestigationOfficer(Integer reportId, String returnReason, String legalAdvisorId, String investigationOfficerId) {
        Report report = getReport(reportId);

        // Verify legal advisor is the current recipient
        if (report.getCurrentRecipient() == null ||
                !report.getCurrentRecipient().getEmployeeId().equals(legalAdvisorId)) {
            throw new RuntimeException("You are not the assigned legal advisor for this report");
        }

        // Verify target is an investigation officer
        Employee investigationOfficer = employeeRepo.findByEmployeeId(investigationOfficerId)
                .orElseThrow(() -> new RuntimeException("Investigation officer not found"));

        // Check if employee is a valid investigation officer
        List<Employee> investigationOfficers = reportRepo.findAvailableT3Officers();
        boolean isValidOfficer = investigationOfficers.stream()
                .anyMatch(o -> o.getEmployeeId().equals(investigationOfficerId));

        if (!isValidOfficer) {
            throw new RuntimeException("Target employee is not a valid investigation officer");
        }

        // Update case status
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER);
        caseRepo.save(relatedCase);

        // Update report
        report.setCurrentRecipient(investigationOfficer);
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

        // Send websocket notification
        NotificationDTO notificationDTO = webSocketNotificationService
                .createNotificationDTO(savedReport, message, investigationOfficer);
        notificationDTO.setNotificationType("REPORT_RETURNED_FROM_LEGAL");
        webSocketNotificationService.sendNotificationToUser(
                investigationOfficerId,
                notificationDTO
        );

        auditService.logAction(
                WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER,
                "Report #" + savedReport.getId() + " returned to investigation officer " +
                        investigationOfficerId + " by legal advisor " + legalAdvisorId +
                        ". Reason: " + returnReason,
                report.getReturnedBy()
        );

        return savedReport;
    }

    @Transactional
    public Report editReport(Integer reportId, ReportRequestDTO reportData,
                             List<String> newAttachmentPaths, String editorId,
                             String returnReason) {

        Report report = getReport(reportId);
        Employee editor = employeeRepo.findByEmployeeId(editorId)
                .orElseThrow(() -> new RuntimeException("Editor not found"));

        // Verify edit is allowed
        if (!canEditReport(report, editorId)) {
            throw new RuntimeException("You are not authorized to edit this report");
        }

        // Update basic report information
        report.setDescription(reportData.getDescription());
        report.setUpdatedAt(LocalDateTime.now());

        // Handle attachments: keep existing ones and add new ones
        List<String> allAttachments = new ArrayList<>();

        // Keep existing attachments (if not being replaced)
        if (report.getAttachmentPaths() != null) {
            allAttachments.addAll(report.getAttachmentPaths());
        }

        // Add new attachments
        if (newAttachmentPaths != null && !newAttachmentPaths.isEmpty()) {
            allAttachments.addAll(newAttachmentPaths);
        }

        report.setAttachmentPaths(allAttachments);

        // Clear return-related fields since we're addressing the issues
        report.setReturnReason(null);
        report.setReturnedBy(null);
        report.setReturnedAt(null);
        report.setReturnDocumentPath(null);
        report.setReturnDocumentOriginalName(null);

        // Set appropriate status based on who is editing
        Case relatedCase = report.getRelatedCase();
        Employee nextRecipient = determineNextRecipientAfterEdit(report, editor);

        if (nextRecipient != null) {
            report.setCurrentRecipient(nextRecipient);
        }

        // Update case status
        WorkflowStatus newStatus = determineStatusAfterEdit(report, editor);
        relatedCase.setStatus(newStatus);
        caseRepo.save(relatedCase);

        // Save the edited report
        Report savedReport = reportRepo.save(report);

        // Log the edit action with return reason context
        String actionDescription = String.format(
                "Report #%d edited by %s. Original return reason: %s. Changes: %s",
                savedReport.getId(),
                editor.getEmployeeId(),
                returnReason != null ? returnReason : "N/A",
                reportData.getDescription().length() > 100 ?
                        reportData.getDescription().substring(0, 100) + "..." :
                        reportData.getDescription()
        );

        auditService.logAction(
                newStatus,
                actionDescription,
                editor
        );

        // Create notification
        String message = String.format(
                "Report #%d has been edited and resubmitted by %s %s. " +
                        "Original return reason addressed: %s",
                savedReport.getId(),
                editor.getGivenName(),
                editor.getFamilyName(),
                returnReason != null ? returnReason : "N/A"
        );

        createNotification(savedReport, message);

        return savedReport;
    }

    public boolean canEditReport(Report report, String employeeId) {
        // Check if report is in a returned status
        WorkflowStatus status = report.getRelatedCase().getStatus();
        boolean isReturnedStatus =
                status == WorkflowStatus.REPORT_RETURNED_TO_INTELLIGENCE_OFFICER ||
                        status == WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION ||
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

            default:
                return null;
        }
    }

    private WorkflowStatus determineStatusAfterEdit(Report report, Employee editor) {
        WorkflowStatus currentStatus = report.getRelatedCase().getStatus();

        switch (currentStatus) {
            case REPORT_RETURNED_TO_INTELLIGENCE_OFFICER:
                return WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE;

            case REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION:
                return WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION;

            case REPORT_RETURNED_TO_INVESTIGATION_OFFICER:
                return WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM;

            default:
                return WorkflowStatus.REPORT_SUBMITTED;
        }
    }
    @Transactional
    public Report submitCasePlan(Integer reportId, String casePlanDescription, MultipartFile casePlanAttachment, String employeeId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee submitter = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Check if the submitter is the investigation officer assigned to this report
        if (report.getInvestigationOfficer() == null ||
                !report.getInvestigationOfficer().getEmployeeId().equals(employeeId)) {
            throw new RuntimeException("You are not the assigned investigation officer for this report");
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
                if (report.getFindingsAttachmentPaths() == null) {
                    report.setFindingsAttachmentPaths(new ArrayList<>());
                }
                report.getFindingsAttachmentPaths().add(casePlanAttachmentPath);
            } catch (Exception e) {
                throw new RuntimeException("Failed to store case plan attachment: " + e.getMessage());
            }
        }

        // Update case status
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.CASE_PLAN_SUBMITTED);
        caseRepo.save(relatedCase);

        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        } else {
            throw new IllegalStateException("No Director of Investigation found.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.CASE_PLAN_SUBMITTED,
                "Case plan submitted for report #" + savedReport.getId() + " by investigation officer " + employeeId,
                submitter
        );

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
                (report.getFindingsAttachmentPaths() == null || report.getFindingsAttachmentPaths().isEmpty())) {
            throw new RuntimeException("No case plan or attachments found to send");
        }

        // Update case status
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION);
        caseRepo.save(relatedCase);

        // Set recipient - Director of Investigation
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        } else {
            throw new IllegalStateException("No Director of Investigation found.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION,
                "Case plan sent to Director of Investigation for report #" + savedReport.getId() +
                        " by " + employeeId,
                sender
        );

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
        if (file == null || file.isEmpty()) return;

        // Validate file size
        if (file.getSize() > maxFileSize) {
            throw new RuntimeException("File size exceeds maximum limit of " + maxFileSize + " bytes");
        }

        // Validate file type - allow PDF and Word documents for case plans
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String lowerFilename = originalFilename.toLowerCase();

        if (!lowerFilename.endsWith(".pdf") &&
                !lowerFilename.endsWith(".doc") &&
                !lowerFilename.endsWith(".docx")) {
            throw new RuntimeException("Only PDF, DOC, and DOCX files are allowed for case plans");
        }
    }

    private String storeCasePlanAttachment(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) return null;

        // Create case-plans subdirectory
        Path uploadPath = Paths.get(uploadDir).resolve("case-plans").toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            try {
                Files.setPosixFilePermissions(uploadPath,
                        Set.of(PosixFilePermission.OWNER_READ,
                                PosixFilePermission.OWNER_WRITE,
                                PosixFilePermission.OWNER_EXECUTE));
            } catch (UnsupportedOperationException e) {
                log.warn("Unable to set POSIX permissions on Windows");
            }
        }

        // Generate secure filename
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        String secureFilename = UUID.randomUUID().toString() + fileExtension;

        Path filePath = uploadPath.resolve(secureFilename);

        // Security check
        if (!filePath.normalize().startsWith(uploadPath)) {
            throw new IOException("Invalid file path - security violation");
        }

        try {
            // Store the file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Verify file was written correctly
            if (!Files.exists(filePath) || Files.size(filePath) != file.getSize()) {
                throw new IOException("File storage verification failed");
            }

            return "case-plans/" + secureFilename;

        } catch (IOException e) {
            // Clean up failed file
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException cleanupException) {
                log.error("Failed to cleanup corrupted file: {}", cleanupException.getMessage());
            }
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
                directorId
        );
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

        // Verify the report has a case plan
        if ((report.getCasePlan() == null || report.getCasePlan().trim().isEmpty()) &&
                (report.getFindingsAttachmentPaths() == null || report.getFindingsAttachmentPaths().isEmpty())) {
            throw new RuntimeException("No case plan found to approve");
        }

        // Update case status
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION);
        caseRepo.save(relatedCase);

        report.setDirectorInvestigation(approver);
        report.setApprovedBy(approver);
        report.setApprovedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());

        // Set next recipient - investigation officer can now proceed with investigation
        if (report.getInvestigationOfficer() != null) {
            report.setCurrentRecipient(report.getInvestigationOfficer());
        }

        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION,
                "Case plan approved for report #" + savedReport.getId() + " by Director of Investigation " + approverId,
                approver
        );

        // Create notification
        String message = String.format("Case plan for report #%d has been approved by Director of Investigation %s %s",
                savedReport.getId(),
                approver.getGivenName(),
                approver.getFamilyName());
        createNotification(savedReport, message);

        // Send websocket notification to investigation officer
        if (report.getInvestigationOfficer() != null) {
            NotificationDTO broadcastNotification = webSocketNotificationService
                    .createNotificationDTO(savedReport, message, report.getInvestigationOfficer());
            broadcastNotification.setNotificationType("CASE_PLAN_APPROVED");
            webSocketNotificationService.sendNotificationToUser(
                    report.getInvestigationOfficer().getEmployeeId(),
                    broadcastNotification
            );
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
                rejector
        );

        // Create notification
        String message = String.format("Case plan for report #%d has been rejected by Director of Investigation %s %s. Reason: %s",
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
                    broadcastNotification
            );
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
        }

        Report savedReport = reportRepo.save(report);

        // Log action
        auditService.logAction(
                WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION,
                "Investigation report approved for report #" + savedReport.getId() +
                        " by Director of Investigation " + approverId,
                approver
        );

        // Create notification
        String message = String.format("Investigation report for case #%s has been approved by Director of Investigation %s %s",
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

        WorkflowStatus newStatus;
        switch(report.getRelatedCase().getStatus()) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE;
                report.setDirectorIntelligence(rejector);
                break;
            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION;
                report.setDirectorInvestigation(rejector);
                break;
            case INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.INVESTIGATION_REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION;
                report.setDirectorInvestigation(rejector);
                report.setInvestigationReportRejectedBy(rejectorId); // Store ID, not object
                report.setInvestigationReportRejectionReason(rejectionReason);
                report.setInvestigationReportRejectedAt(LocalDateTime.now());

                // Return to investigation officer
                if (report.getInvestigationOfficer() != null) {
                    report.setCurrentRecipient(report.getInvestigationOfficer());
                } else {
                    report.setCurrentRecipient(report.getCreatedBy());
                }
                break;
            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER;
                report.setAssistantCommissioner(rejector);
                break;
            default:
                throw new IllegalStateException("Cannot reject report in current status: " + report.getRelatedCase().getStatus());
        }

        // For non-investigation report cases, set common fields
        if (report.getRelatedCase().getStatus() != WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION) {
            report.setRejectedBy(rejector);
            report.setRejectionReason(rejectionReason);
            report.setRejectedAt(LocalDateTime.now());
            report.setCurrentRecipient(report.getCreatedBy());
        }

        report.getRelatedCase().setStatus(newStatus);
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
                rejector
        );
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
                returner
        );

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
                    broadcastNotification
            );
        }

        return savedReport;
    }
}