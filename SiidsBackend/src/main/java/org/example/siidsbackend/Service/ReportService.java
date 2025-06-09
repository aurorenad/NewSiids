package org.example.siidsbackend.Service;

import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.ReportRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReportService {
    @Autowired
    private ReportRepo reportRepo;

    @Autowired
    private EmployeeRepo employeeRepo;

    public Report createReport(ReportRequestDTO dto, String employeeId) {
        Employee creator = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        Report report = new Report();
        report.setDescription(dto.getDescription());
        report.setAttachmentPath(dto.getAttachmentPath());
        report.setCreatedBy(creator);
        report.setCreatedAt(LocalDateTime.now());
        report.setStatus(WorkflowStatus.REPORT_SUBMITTED);

        return reportRepo.save(report);
    }

    @Transactional
    public Report sendToDirector(Integer reportId, String directorId) {
        Report report = getReport(reportId);
        Employee director = employeeRepo.findByEmployeeId(directorId)
                .orElseThrow(() -> new RuntimeException("Director not found"));

        report.setStatus(WorkflowStatus.CASE_SUBMITTED_TO_DIRECTOR);
        report.setCurrentRecipient(director);
        report.setUpdatedAt(LocalDateTime.now());
        return reportRepo.save(report);
    }

    @Transactional
    public Report sendToAssistantCommissioner(Integer reportId, String commissionerId) {
        Report report = getReport(reportId);
        Employee commissioner = employeeRepo.findByEmployeeId(commissionerId)
                .orElseThrow(() -> new RuntimeException("Commissioner not found"));

        report.setStatus(WorkflowStatus.REPORT_SUBMITTED);
        report.setCurrentRecipient(commissioner);
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