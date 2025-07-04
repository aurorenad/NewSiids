package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;
import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Service.ReportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;
    private final EmployeeRepo employeeRepo;

    @PostMapping  // Keep as /api/reports
    public ResponseEntity<ReportResponseDTO> createReport(
            @RequestParam("description") String description,
            @RequestParam("caseNum") String caseNum,  // Changed from @PathVariable to @RequestParam
            @RequestParam(value = "attachment", required = false) MultipartFile attachment,
            @RequestHeader("employee_id") String employeeId) {

        try {
            if (description == null || description.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            String attachmentPath = null;
            if (attachment != null && !attachment.isEmpty()) {
                attachmentPath = storeAttachment(attachment);
            }

            ReportRequestDTO dto = new ReportRequestDTO();
            dto.setDescription(description);
            dto.setAttachmentPath(attachmentPath);

            // Create a Case object with just the ID
            Case caseObj = new Case();
            caseObj.setCaseNum(caseNum);
            dto.setRelatedCase(caseObj);

            Report report = reportService.createReport(dto, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error creating report: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String storeAttachment(MultipartFile file) throws Exception {
        // Create uploads directory if it doesn't exist
        Path uploadDir = Paths.get("uploads");
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        // Generate unique filename
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = uploadDir.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);
        return fileName;
    }

    @GetMapping("/my-reports")
    public ResponseEntity<List<ReportResponseDTO>> getMyReports(
            @RequestHeader("employee_id") String employeeId) {
        try {
            List<Report> reports = reportService.getReportsByEmployee(employeeId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            System.err.println("Error getting reports: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportResponseDTO> getReport(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Report report = reportService.getReport(id);
            // Add authorization check here if needed
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error getting report: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/{id}/send-to-director-intelligence")
    public ResponseEntity<ReportResponseDTO> sendToDirectorIntelligence(
            @PathVariable("id") Integer reportId,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Employee sender = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Sender not found"));

            Report report = reportService.sendToDirectorIntelligence(reportId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error sending to Director of Intelligence: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/{id}/send-to-commissioner-intelligence")
    public ResponseEntity<ReportResponseDTO> sendToAssistantCommissioner(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Employee sender = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Sender not found"));

            Report report = reportService.sendToAssistantCommissioner(id);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error sending to Assistant Commissioner: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/{id}/send-to-director-investigation")
    public ResponseEntity<ReportResponseDTO> sendToDirectorInvestigation(
            @PathVariable("id") Integer reportId,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Employee sender = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Sender not found"));

            Report report = reportService.sendToDirectorInvestigation(reportId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error sending to Director of Intelligence: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/{id}/return")
    public ResponseEntity<ReportResponseDTO> returnReport(
            @PathVariable Integer id,
            @RequestParam String returnToEmployeeId,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Report report = reportService.returnReport(id, returnToEmployeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error returning report: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/director-intelligence/reports")
    public ResponseEntity<List<ReportResponseDTO>> getReportsForDirectorIntelligence(
            @RequestHeader("employee_id") String directorId) {
        try {
            List<Report> reports = reportService.getReportsForDirectorIntelligence(directorId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (RuntimeException e) {
            System.err.println("Error getting reports for Director of Intelligence: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            System.err.println("Error getting reports: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ReportResponseDTO> approveReport(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Employee approver = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Approver not found"));

            Report report = reportService.approveReport(id, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error approving report: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ReportResponseDTO> rejectReport(
            @PathVariable Integer id,
            @RequestParam(required = false) String rejectionReason,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Employee rejector = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Rejector not found"));

            Report report = reportService.rejectReport(id, rejectionReason, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error rejecting report: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
}