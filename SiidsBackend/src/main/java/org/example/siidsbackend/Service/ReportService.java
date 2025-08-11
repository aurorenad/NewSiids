package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.DirectorIntelligenceReportDTO;
import org.example.siidsbackend.DTO.FinesReportDTO;
import org.example.siidsbackend.DTO.NotificationDTO;
import org.example.siidsbackend.DTO.OfficerReportsDTO;
import org.example.siidsbackend.DTO.Request.FindingsRequestDTO;
import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.NotificationRepo;
import org.example.siidsbackend.Repository.ReportRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
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
    private final WebSocketNotificationService webSocketNotificationService;
    private final AuditService auditService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${file.max-size:10485760}")
    private long maxFileSize;

    @Transactional
    public Report createReport(ReportRequestDTO dto, String employeeId) {
        Employee creator = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + employeeId));

        Case relatedCase = caseRepo.findByCaseNum(dto.getCaseNum())
                .orElseThrow(() -> new RuntimeException("Case not found with number: " + dto.getCaseNum()));

        validateAttachment(dto.getAttachmentPath());

        Report report = new Report();
        report.setDescription(dto.getDescription());
        report.setAttachmentPath(dto.getAttachmentPath());
        report.setCreatedBy(creator);
        report.setRelatedCase(relatedCase);
        report.setCreatedAt(LocalDateTime.now());

        relatedCase.setStatus(WorkflowStatus.REPORT_SUBMITTED);
        caseRepo.save(relatedCase);

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                WorkflowStatus.REPORT_SUBMITTED,
                "Report " + savedReport.getId() + " created by " + creator.getEmployeeId() + " for case " + relatedCase.getCaseNum(),
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

        if (report.getCurrentRecipient() == null ||
                !report.getCurrentRecipient().getEmployeeId().equals(officerId)) {
            throw new RuntimeException("You are not the assigned investigation officer for this report");
        }

        List<String> attachmentPaths = new ArrayList<>();
        if (findingsDTO.getAttachments() != null) {
            for (MultipartFile file : findingsDTO.getAttachments()) {
                if (!file.isEmpty()) {
                    try {
                        String path = storeAttachment(file);
                        attachmentPaths.add(path);
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to store attachment: " + e.getMessage());
                    }
                }
            }
        }

        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.INVESTIGATION_COMPLETED);
        caseRepo.save(relatedCase);

        report.setPrincipleAmount(findingsDTO.getPrincipleAmount());
        report.setPenaltiesAmount(findingsDTO.getPenaltiesAmount());

        report.setFindings(findingsDTO.getFindings());
        report.setRecommendations(findingsDTO.getRecommendations());
        report.setFindingsAttachmentPaths(attachmentPaths);
        report.setUpdatedAt(LocalDateTime.now());

        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        } else {
            throw new IllegalStateException("No Director of Investigation found.");
        }

        Report savedReport = reportRepo.save(report);
        auditService.logAction(
                WorkflowStatus.INVESTIGATION_COMPLETED,
                "Findings submitted for report #" + savedReport.getId() + " by officer " + officerId,
                report.getCurrentRecipient()
        );


        String message = String.format("Investigation findings submitted for report #%d by %s %s",
                savedReport.getId(),
                savedReport.getCurrentRecipient().getGivenName(),
                savedReport.getCurrentRecipient().getFamilyName());
        createNotification(savedReport, message);

        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("INVESTIGATION_FINDINGS_SUBMITTED");
        webSocketNotificationService.sendNotificationToDirectorsInvestigation(broadcastNotification);

        return savedReport;
    }

    private String storePdfAttachment(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;

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

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        Path filePath = uploadPath.resolve(originalFilename);

        if (!filePath.normalize().startsWith(uploadPath)) {
            throw new IOException("Invalid file path - security violation");
        }

        try {
            Files.copy(file.getInputStream(), filePath,
                    StandardCopyOption.REPLACE_EXISTING);

            if (!Files.exists(filePath) || Files.size(filePath) != file.getSize()) {
                throw new IOException("File storage verification failed");
            }

            verifyStoredPdf(filePath);

            return originalFilename;

        } catch (IOException e) {
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException cleanupException) {
                log.error("Failed to cleanup corrupted file: {}", cleanupException.getMessage());
            }
            throw new IOException("Failed to store PDF file: " + e.getMessage(), e);
        }
    }

    private void validatePdfStructure(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            byte[] buffer = new byte[1024];
            int bytesRead = inputStream.read(buffer);

            if (bytesRead < 100) {
                throw new RuntimeException("File too small to be a valid PDF");
            }

            String content = new String(buffer, 0, bytesRead);

            if (!content.contains("obj") || !content.contains("endobj")) {
                throw new RuntimeException("Missing required PDF objects");
            }

            if (!content.contains("xref")) {
                throw new RuntimeException("Missing PDF cross-reference table");
            }

            if (!content.contains("trailer")) {
                throw new RuntimeException("Missing PDF trailer");
            }

            if (!content.contains("startxref")) {
                throw new RuntimeException("Missing PDF startxref");
            }

            if (!content.contains("%%EOF")) {
                throw new RuntimeException("Missing PDF EOF marker");
            }

            if (content.contains("%%EOF%%EOF") || content.contains("trailertrailer")) {
                throw new RuntimeException("Suspicious PDF structure - possible corruption");
            }
        } catch (IOException e) {
            throw new RuntimeException("Error validating PDF structure", e);
        }
    }

    private String storeFile(MultipartFile file) throws Exception {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        Path filePath = uploadPath.resolve(originalFilename);

        if (!filePath.normalize().startsWith(uploadPath)) {
            throw new IOException("Invalid file path");
        }

        if (Files.exists(filePath)) {
            throw new IOException("File already exists");
        }

        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        return originalFilename;
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
    public Report returnReport(Integer reportId, String returnReason, String returnToEmployeeId, String returnerId) {
        Report report = getReport(reportId);
        Employee returnTo = employeeRepo.findByEmployeeId(returnToEmployeeId)
                .orElseThrow(() -> new RuntimeException("Return target employee not found"));
        Employee returner = employeeRepo.findByEmployeeId(returnerId)
                .orElseThrow(() -> new RuntimeException("Returner not found"));

        WorkflowStatus newStatus;
        switch(report.getRelatedCase().getStatus()) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
            case REPORT_SUBMITTED:
                newStatus = WorkflowStatus.REPORT_RETURNED_TO_INTELLIGENCE_OFFICER;
                break;
            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
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
                returner
        );
        return savedReport;
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
        dto.setAttachmentPath(report.getAttachmentPath());
        dto.setStatus(report.getRelatedCase() != null ? report.getRelatedCase().getStatus() : null);
        dto.setCreatedBy(report.getCreatedBy().getGivenName() + " " + report.getCreatedBy().getFamilyName());
        dto.setCurrentRecipient(report.getCurrentRecipient() != null ?
                report.getCurrentRecipient().getGivenName() + " " + report.getCurrentRecipient().getFamilyName() : null);
        dto.setCreatedAt(report.getCreatedAt());
        dto.setUpdatedAt(report.getUpdatedAt());
        dto.setCreatedByEmployeeId(report.getCreatedBy().getEmployeeId());
        dto.setRelatedCase(report.getRelatedCase());
        dto.setApprovedBy(report.getApprovedBy() != null ?
                report.getApprovedBy().getGivenName() + " " + report.getApprovedBy().getFamilyName() : null);
        dto.setApprovedAt(report.getApprovedAt());
        dto.setRejectedBy(report.getRejectedBy() != null ?
                report.getRejectedBy().getGivenName() + " " + report.getRejectedBy().getFamilyName() : null);
        dto.setRejectionReason(report.getRejectionReason());
        dto.setRejectedAt(report.getRejectedAt());
        dto.setFindings(report.getFindings());
        dto.setRecommendations(report.getRecommendations());
        dto.setFindingsAttachmentPaths(report.getFindingsAttachmentPaths());
        dto.setAssistantCommissioner(report.getAssistantCommissioner() != null ?
                report.getAssistantCommissioner().getGivenName() + " " +
                        report.getAssistantCommissioner().getFamilyName() : null);
        dto.setDirectorInvestigation(report.getDirectorInvestigation() != null ?
                report.getDirectorInvestigation().getGivenName() + " " +
                        report.getDirectorInvestigation().getFamilyName() : null);
        dto.setDirectorIntelligence(report.getDirectorIntelligence() != null ?
                report.getDirectorIntelligence().getGivenName() + " " +
                        report.getDirectorIntelligence().getFamilyName() : null);
        dto.setInvestigationOfficer(report.getInvestigationOfficer() != null ?
                report.getInvestigationOfficer().getGivenName() + " " +
                        report.getInvestigationOfficer().getFamilyName() : null);
        dto.setPrincipleAmount(report.getPrincipleAmount());
        dto.setPenaltiesAmount(report.getPenaltiesAmount());
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
            case  REPORT_SUBMITTED:
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
                break;

            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION;
                report.setDirectorInvestigation(approver);
                break;

            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER;
                report.setAssistantCommissioner(approver);

                List<Employee> directors = reportRepo.DirectorsOfInvestigation();
                if (!directors.isEmpty()) {
                    report.setCurrentRecipient(directors.get(0));
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
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE;
                report.setDirectorIntelligence(rejector);
                break;
            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION;
                report.setDirectorInvestigation(rejector);
                break;
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
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

        report.setCurrentRecipient(assignedOfficer);
        report.setInvestigationOfficer(assignedOfficer);
        report.setAssignmentNotes(assignmentNotes);
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
                report.getCurrentRecipient() // or get the assigner from context
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

    public List<Report> getReportsAssignedToInvestigationOfficer(String officerId) {
        List<Employee> officers = reportRepo.findAvailableT3Officers();
        boolean isValidOfficer = officers.stream()
                .anyMatch(officer -> officer.getEmployeeId().equals(officerId));

        if (!isValidOfficer) {
            throw new RuntimeException("Employee is not a T3 Investigation Officer");
        }

        return reportRepo.findReportsAssignedToInvestigationOfficer(officerId);
    }

    private String storeAttachment(MultipartFile file) throws Exception {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (!originalFilename.toLowerCase().endsWith(".pdf")) {
            throw new Exception("Only PDF files are allowed");
        }

        Path uploadDir = Paths.get("uploads");
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        String fileName = UUID.randomUUID().toString() + "_" + originalFilename;
        Path filePath = uploadDir.resolve(fileName);

        if (Files.exists(filePath)) {
            throw new Exception("File with this name already exists");
        }

        Files.copy(file.getInputStream(), filePath);
        return fileName;
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

            if (report.getAttachmentPath() != null && report.getAttachmentPath().equals(filename)) {
                isValidAttachment = true;
            }

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

            if (bytesRead < 8) {
                throw new IOException("File too small to be a valid PDF (only " + bytesRead + " bytes)");
            }

            String header = new String(buffer, 0, 8);
            if (!header.startsWith("%PDF-")) {
                throw new IOException("Invalid PDF header: " + header);
            }

            try {
                String versionStr = header.substring(5, 8);
                float version = Float.parseFloat(versionStr);
                if (version < 1.0 || version > 1.7) {
                    throw new IOException("Unsupported PDF version: " + version);
                }
            } catch (NumberFormatException e) {
                throw new IOException("Invalid PDF version format", e);
            }

            String content = new String(buffer, 0, bytesRead);
            if (!content.contains("obj") || !content.contains("endobj")) {
                throw new IOException("Missing required PDF objects");
            }

            long fileSize = Files.size(filePath);
            if (fileSize > 6) {
                byte[] endBuffer = new byte[6];
                try (InputStream endStream = Files.newInputStream(filePath)) {
                    endStream.skip(fileSize - 6);
                    endStream.read(endBuffer);
                    String endMarker = new String(endBuffer);
                    if (!endMarker.equals("%%EOF")) {
                        throw new IOException("Missing PDF EOF marker");
                    }
                }
            }

            boolean hasBinaryContent = false;
            for (int i = 0; i < bytesRead; i++) {
                if ((buffer[i] & 0xFF) < 9 || ((buffer[i] & 0xFF) > 127 && (buffer[i] & 0xFF) < 160)) {
                    hasBinaryContent = true;
                    break;
                }
            }

            if (!hasBinaryContent) {
                throw new IOException("File appears to be text rather than binary PDF");
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
//        reportDTO.setAveragePrincipleAmount(avgPrinciple);
//        reportDTO.setAveragePenaltiesAmount(avgPenalties);
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

    public List<Report> getReportsAssignedToInvestigationOfficers(String officerId) {
        return reportRepo.findReportsAssignedToInvestigationOfficers(officerId);
    }
}