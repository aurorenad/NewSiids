package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.DTO.NotificationDTO;
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

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final ReportRepo reportRepo;
    private final EmployeeRepo employeeRepo;
    private final CaseRepo caseRepo;
    private final NotificationRepo notificationRepo;
    private final WebSocketNotificationService webSocketNotificationService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Transactional
    public Report createReport(ReportRequestDTO dto, String employeeId) {
        Employee creator = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + employeeId));

        Case relatedCase = caseRepo.findByCaseNum(dto.getRelatedCase().getCaseNum())
                .orElseThrow(() -> new RuntimeException("Case not found with number: " + dto.getRelatedCase().getCaseNum()));
        Report report = new Report();
        report.setDescription(dto.getDescription());
        report.setAttachmentPath(dto.getAttachmentPath());
        report.setCreatedBy(creator);
        report.setRelatedCase(relatedCase);
        report.setCreatedAt(LocalDateTime.now());

        relatedCase.setStatus(WorkflowStatus.REPORT_SUBMITTED);
        caseRepo.save(relatedCase);

        return reportRepo.save(report);
    }

    private void createNotification(Report report, String message) {
        if (report.getCurrentRecipient() != null) {
            // Save notification in database
            Notification notification = new Notification();
            notification.setMessage(message);
            notification.setRecipient(report.getCurrentRecipient());
            notification.setReport(report);
            notification.setCreatedAt(LocalDateTime.now());
            notification.setRead(false);
            notificationRepo.save(notification);

            // Send real-time notification
            NotificationDTO notificationDTO = webSocketNotificationService
                    .createNotificationDTO(report, message, report.getCurrentRecipient());
            notificationDTO.setNotificationType(getNotificationType(report.getStatus()));

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

        // Update the case status
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

        // Create and send notification
        String message = String.format("New report #%d submitted for your review by %s %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName());
        createNotification(savedReport, message);

        // Also broadcast to all directors of intelligence
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

        String message = String.format("New investigation report #%d submitted for your review by %s %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName());
        createNotification(savedReport, message);

        // Broadcast to all directors of investigation
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

        // Broadcast to all assistant commissioners
        NotificationDTO broadcastNotification = webSocketNotificationService
                .createNotificationDTO(savedReport, message, savedReport.getCurrentRecipient());
        broadcastNotification.setNotificationType("NEW_REPORT_ASSISTANT_COMMISSIONER");
        webSocketNotificationService.sendNotificationToAssistantCommissioners(broadcastNotification);

        return savedReport;
    }

    @Transactional
    public Report returnReport(Integer reportId, String returnToEmployeeId) {
        Report report = getReport(reportId);
        Employee returnTo = employeeRepo.findByEmployeeId(returnToEmployeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        report.getRelatedCase().setStatus(WorkflowStatus.REPORT_RETURNED);
        report.setCurrentRecipient(returnTo);
        report.setUpdatedAt(LocalDateTime.now());
        Report savedReport = reportRepo.save(report);

        String message = String.format("Report #%d has been returned for corrections", savedReport.getId());
        createNotification(savedReport, message);

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
            case REPORT_RETURNED:
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
        dto.setRelatedCase(report.getRelatedCase());
        dto.setApprovedBy(report.getApprovedBy() != null ?
                report.getApprovedBy().getGivenName() + " " + report.getApprovedBy().getFamilyName() : null);
        dto.setApprovedAt(report.getApprovedAt());
        dto.setRejectedBy(report.getRejectedBy() != null ?
                report.getRejectedBy().getGivenName() + " " + report.getRejectedBy().getFamilyName() : null);
        dto.setRejectionReason(report.getRejectionReason());
        dto.setRejectedAt(report.getRejectedAt());
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
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE;
                break;
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE:
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER;
                break;
            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION;
                break;
            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER;
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

        return savedReport;
    }

    @Transactional
    public Report rejectReport(Integer reportId, String rejectionReason, String rejectorId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee rejector = employeeRepo.findByEmployeeId(rejectorId)
                .orElseThrow(() -> new RuntimeException("Rejector not found"));

        WorkflowStatus newStatus;
        switch(report.getStatus()) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE;
                break;
            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION;
                break;
            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER:
                newStatus = WorkflowStatus.REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER;
                break;
            default:
                throw new IllegalStateException("Cannot reject report in current status: " + report.getStatus());
        }

        report.getRelatedCase().setStatus(newStatus);
        report.setRejectedBy(rejector);
        report.setRejectionReason(rejectionReason);
        report.setRejectedAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());
        report.setCurrentRecipient(report.getCreatedBy()); // Return to creator

        Report savedReport = reportRepo.save(report);

        // Notify creator
        String message = String.format("Your report #%d has been rejected by %s %s. Reason: %s",
                savedReport.getId(),
                rejector.getGivenName(),
                rejector.getFamilyName(),
                rejectionReason != null ? rejectionReason : "No reason provided");
        createNotification(savedReport, message);

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
    public Report assignToInvestigationOfficer(Integer reportId, String specificOfficerId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        Employee assignedOfficer;

        if (specificOfficerId != null && !specificOfficerId.trim().isEmpty()) {
            // Assign to specific officer
            assignedOfficer = employeeRepo.findByEmployeeId(specificOfficerId)
                    .orElseThrow(() -> new RuntimeException("Officer not found with ID: " + specificOfficerId));

            // Verify the officer is a T3 Investigation Officer
            List<Employee> availableOfficers = reportRepo.findAvailableT3Officers();
            boolean isValidOfficer = availableOfficers.stream()
                    .anyMatch(officer -> officer.getEmployeeId().equals(specificOfficerId));

            if (!isValidOfficer) {
                throw new RuntimeException("Employee is not a valid T3 Investigation Officer");
            }
        } else {
            // Auto-assign to available officer with least workload
            assignedOfficer = findBestAvailableOfficer();
        }

        // Update case status
        Case relatedCase = report.getRelatedCase();
        relatedCase.setStatus(WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER);
        caseRepo.save(relatedCase);

        // Update report
        report.setCurrentRecipient(assignedOfficer);
        report.setUpdatedAt(LocalDateTime.now());
        Report savedReport = reportRepo.save(report);

        // Create notification
        String message = String.format("Investigation report #%d has been assigned to you for investigation by %s %s",
                savedReport.getId(),
                savedReport.getCreatedBy().getGivenName(),
                savedReport.getCreatedBy().getFamilyName());
        createNotification(savedReport, message);

        // Send WebSocket notification
        NotificationDTO notificationDTO = webSocketNotificationService
                .createNotificationDTO(savedReport, message, assignedOfficer);
        notificationDTO.setNotificationType("REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER");
        webSocketNotificationService.sendNotificationToUser(
                assignedOfficer.getEmployeeId(),
                notificationDTO
        );

        return savedReport;
    }

    private Employee findBestAvailableOfficer() {
        List<Employee> availableOfficers = reportRepo.findAvailableT3Officers();

        if (availableOfficers.isEmpty()) {
            throw new RuntimeException("No available T3 Investigation Officers found");
        }

        // Find officer with least current workload
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
        // Count active reports assigned to this officer
        return reportRepo.countActiveReportsByOfficer(officerId);
    }

    public List<Employee> getAvailableInvestigationOfficers() {
        return reportRepo.findAvailableT3Officers();
    }

    public List<Report> getReportsAssignedToInvestigationOfficer(String officerId) {
        // Verify the requester is a T3 Investigation Officer
        List<Employee> officers = reportRepo.findAvailableT3Officers();
        boolean isValidOfficer = officers.stream()
                .anyMatch(officer -> officer.getEmployeeId().equals(officerId));

        if (!isValidOfficer) {
            throw new RuntimeException("Employee is not a T3 Investigation Officer");
        }

        return reportRepo.findReportsAssignedToInvestigationOfficer(officerId);
    }

}