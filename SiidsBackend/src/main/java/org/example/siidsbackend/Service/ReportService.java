package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.CaseRepo;
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

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Transactional
    public Report createReport(ReportRequestDTO dto, String employeeId) {
        Employee creator = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + employeeId));

        Case caseEntity = caseRepo.findById(dto.getRelatedCase())
                .orElseThrow(() -> new RuntimeException("Case not found with ID: " + dto.getRelatedCase()));

        Report report = new Report();
        report.setDescription(dto.getDescription());
        report.setAttachmentPath(dto.getAttachmentPath());
        report.setCreatedBy(creator);
        report.setRelatedCase(caseEntity);
        report.setCreatedAt(LocalDateTime.now());
        report.setStatus(WorkflowStatus.REPORT_SUBMITTED);

        return reportRepo.save(report);
    }

    @Transactional
    public Report sendToDirectorIntelligence(Integer reportId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        List<Employee> directors = reportRepo.DirectorsOfIntelligence();

        report.setStatus(WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE);
        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        } else {
            throw new IllegalStateException("No Director of Intelligence found.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        return reportRepo.save(report);
    }

    @Transactional
    public Report sendToDirectorInvestigation(Integer reportId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        List<Employee> directors = reportRepo.DirectorsOfInvestigation();

        report.setStatus(WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION);
        if (!directors.isEmpty()) {
            report.setCurrentRecipient(directors.get(0));
        } else {
            throw new IllegalStateException("No Director of Investigation found.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        return reportRepo.save(report);
    }

    @Transactional
    public Report sendToAssistantCommissioner(Integer reportId) {
        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        List<Employee> commissioners = reportRepo.assistantCommissioner();

        report.setStatus(WorkflowStatus.REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER);
        if (!commissioners.isEmpty()) {
            report.setCurrentRecipient(commissioners.get(0));
        } else {
            throw new IllegalStateException("No Assistant Commissioner found.");
        }

        report.setUpdatedAt(LocalDateTime.now());
        return reportRepo.save(report);
    }



    @Transactional
    public Report returnReport(Integer reportId, String returnToEmployeeId) {
        Report report = getReport(reportId);
        Employee returnTo = employeeRepo.findByEmployeeId(returnToEmployeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        report.setStatus(WorkflowStatus.REPORT_RETURNED);
        report.setCurrentRecipient(returnTo);
        report.setUpdatedAt(LocalDateTime.now());
        return reportRepo.save(report);
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
        dto.setStatus(report.getStatus());
        dto.setCreatedBy(report.getCreatedBy().getGivenName() + " " + report.getCreatedBy().getFamilyName());
        dto.setCurrentRecipient(report.getCurrentRecipient() != null ?
                report.getCurrentRecipient().getGivenName() + " " + report.getCurrentRecipient().getFamilyName() : null);
        dto.setCreatedAt(report.getCreatedAt());
        dto.setUpdatedAt(report.getUpdatedAt());
        return dto;
    }

    public List<Report> getReportsByEmployee(String employeeId) {
        Employee employee = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return reportRepo.findByCreatedByOrderByCreatedAtDesc(employee);
    }

}