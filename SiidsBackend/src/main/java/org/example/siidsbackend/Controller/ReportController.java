package org.example.siidsbackend.Controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.DirectorIntelligenceReportDTO;
import org.example.siidsbackend.DTO.FinesReportDTO;
import org.example.siidsbackend.DTO.OfficerReportsDTO;
import org.example.siidsbackend.DTO.Request.FindingsRequestDTO;
import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Response.CaseResponseDTO;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;
import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.ReportRepo;
import org.example.siidsbackend.Service.CaseService;
import org.example.siidsbackend.Service.ReportService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermission;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {
    private final ReportService reportService;
    private final EmployeeRepo employeeRepo;
    private final ReportRepo reportRepo;
    private final CaseRepo caseRepo;
    private final CaseService caseService;
    private final ObjectMapper objectMapper;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${file.max-size:10485760}")
    private String maxFileSize;

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("application/pdf");
    private static final Map<String, String> EXTENSION_TO_MIME = Map.of("pdf", "application/pdf");

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportResponseDTO> createReport(
            @RequestPart("reportData") String reportDataJson,
            @RequestPart(value = "attachment", required = false) MultipartFile attachment,
            @RequestHeader("employee_id") String employeeId) {

        try {
            ReportRequestDTO reportData = objectMapper.readValue(reportDataJson, ReportRequestDTO.class);

            if (reportData.getDescription() == null || reportData.getDescription().trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            String attachmentPath = null;
            if (attachment != null && !attachment.isEmpty()) {
                validatePdfFile(attachment);
                attachmentPath = storePdfAttachment(attachment);
            }

            reportData.setAttachmentPath(attachmentPath);
            Report report = reportService.createReport(reportData, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Validation error creating report: {}", e.getMessage());
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            log.error("Error creating report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/attachment")
    public ResponseEntity<?> downloadAttachment(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId) {

        try {
            // Validate report exists and user has access
            Report report = reportService.getReport(id);
            validateAttachmentAccess(report, employeeId);

            // Validate attachment path
            if (report.getAttachmentPath() == null || report.getAttachmentPath().trim().isEmpty()) {
                log.warn("Empty attachment path for report {}", id);
                return ResponseEntity.notFound().build();
            }

            // DEBUG: Log the values
            log.info("Upload directory: {}", uploadDir);
            log.info("Attachment path from DB: {}", report.getAttachmentPath());

            // Resolve and validate file path
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(report.getAttachmentPath()).normalize();

            // DEBUG: Log resolved paths
            log.info("Upload directory resolved: {}", uploadPath);
            log.info("File path resolved: {}", filePath);
            log.info("File exists: {}", Files.exists(filePath));
            log.info("File is readable: {}", Files.isReadable(filePath));
            log.info("File size: {}", Files.exists(filePath) ? Files.size(filePath) : "N/A");

            // Security: Prevent path traversal
            if (!filePath.startsWith(uploadPath)) {
                log.error("Path traversal attempt detected for file: {}", filePath);
                return ResponseEntity.badRequest().body("Invalid file path");
            }

            // Verify file exists and is readable
            if (!Files.exists(filePath)) {
                log.error("File not found: {}", filePath);
                // DEBUG: List directory contents
                try {
                    log.info("Upload directory contents: {}",
                            Files.list(uploadPath).map(Path::getFileName).collect(Collectors.toList()));
                } catch (IOException e) {
                    log.error("Cannot list directory contents: {}", e.getMessage());
                }
                return ResponseEntity.notFound().build();
            }

            if (!Files.isReadable(filePath)) {
                log.error("File not readable: {}", filePath);
                // DEBUG: Check file permissions
                try {
                    Set<PosixFilePermission> permissions = Files.getPosixFilePermissions(filePath);
                    log.info("File permissions: {}", permissions);
                } catch (UnsupportedOperationException e) {
                    log.info("POSIX permissions not supported on this system");
                } catch (IOException e) {
                    log.error("Cannot read file permissions: {}", e.getMessage());
                }
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("File not readable");
            }

            // Verify PDF integrity before serving
            try {
                verifyStoredPdf(filePath);
            } catch (IOException e) {
                log.error("PDF corruption detected during download: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("File appears to be corrupted");
            }

            // Prepare resource for download
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                log.error("Resource not accessible: exists={}, readable={}",
                        resource.exists(), resource.isReadable());
                return ResponseEntity.notFound().build();
            }

            String originalFilename = extractOriginalFilename(report.getAttachmentPath());
            long fileSize = Files.size(filePath);

            log.info("Serving file: {} ({}KB)", originalFilename, fileSize / 1024);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(fileSize)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + originalFilename + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .header(HttpHeaders.EXPIRES, "0")
                    .header("X-Content-Type-Options", "nosniff")
                    .body(resource);

        } catch (RuntimeException e) {
            log.error("Access denied for employee {}: {}", employeeId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error downloading attachment for report {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping(value = "/{id}/submit-findings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportResponseDTO> submitFindings(
            @PathVariable Integer id,
            @RequestPart("findingsData") String findingsDataJson,
            @RequestPart(value = "attachments", required = false) MultipartFile[] attachments,
            @RequestHeader("employee_id") String officerId) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            FindingsRequestDTO findingsDTO = objectMapper.readValue(findingsDataJson, FindingsRequestDTO.class);
            findingsDTO.setAttachments(attachments);

            Report report = reportService.submitFindings(id, findingsDTO, officerId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            System.err.println("Error submitting findings: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            System.err.println("Error submitting findings: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/findings-attachments/by-name/{filename}")
    public ResponseEntity<?> downloadFindingsAttachmentByName(
            @PathVariable Integer id,
            @PathVariable String filename,
            @RequestHeader("employee_id") String employeeId) {
        try {
            // Get report and verify access
            Report report = reportService.getReport(id);
            validateAttachmentAccess(report, employeeId);

            // Ensure filename exists in the list
            if (report.getFindingsAttachmentPaths() == null ||
                    !report.getFindingsAttachmentPaths().contains(filename)) {
                return ResponseEntity.notFound().build();
            }

            // Resolve full path
            Path filePath = Paths.get(uploadDir).resolve(filename).normalize().toAbsolutePath();

            if (!filePath.startsWith(Paths.get(uploadDir).normalize().toAbsolutePath())) {
                return ResponseEntity.badRequest().body("Invalid path");
            }
            if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
                return ResponseEntity.notFound().build();
            }

            verifyStoredPdf(filePath);
            Resource resource = new UrlResource(filePath.toUri());

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + extractOriginalFilename(filename) + "\"")
                    .body(resource);

        } catch (Exception e) {
            log.error("Error:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error getting report: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/{id}/participants")
    public ResponseEntity<Map<String, String>> getReportParticipants(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Report report = reportService.getReport(id);

            // Check access permissions
            boolean hasAccess = report.getCreatedBy().getEmployeeId().equals(employeeId) ||
                    (report.getCurrentRecipient() != null &&
                            report.getCurrentRecipient().getEmployeeId().equals(employeeId)) ||
                    reportRepo.DirectorsOfInvestigation().stream()
                            .anyMatch(d -> d.getEmployeeId().equals(employeeId));

            if (!hasAccess) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Map<String, String> participants = new HashMap<>();

            if (report.getAssistantCommissioner() != null) {
                participants.put("assistantCommissioner",
                        report.getAssistantCommissioner().getGivenName() + " " +
                                report.getAssistantCommissioner().getFamilyName());
            }

            if (report.getDirectorInvestigation() != null) {
                participants.put("directorInvestigation",
                        report.getDirectorInvestigation().getGivenName() + " " +
                                report.getDirectorInvestigation().getFamilyName());
            }

            if (report.getDirectorIntelligence() != null) {
                participants.put("directorIntelligence",
                        report.getDirectorIntelligence().getGivenName() + " " +
                                report.getDirectorIntelligence().getFamilyName());
            }

            if (report.getInvestigationOfficer() != null) {
                participants.put("investigationOfficer",
                        report.getInvestigationOfficer().getGivenName() + " " +
                                report.getInvestigationOfficer().getFamilyName());
            }

            return ResponseEntity.ok(participants);
        } catch (Exception e) {
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
            System.err.println("Error sending to Director of Investigation: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/{id}/return")
    public ResponseEntity<ReportResponseDTO> returnReport(
            @PathVariable Integer id,
            @RequestParam String returnToEmployeeId,
            @RequestParam String returnReason,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Employee returner = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Returner not found"));

            Employee returnTarget = employeeRepo.findByEmployeeId(returnToEmployeeId)
                    .orElseThrow(() -> new RuntimeException("Return target employee not found"));

            if (returnReason == null || returnReason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(null);
            }

            Report report = reportService.returnReport(id, returnReason, returnToEmployeeId, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            System.err.println("Error returning report: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        } catch (Exception e) {
            System.err.println("Error returning report: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
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

    @GetMapping("/assistant-commissioner/approved-reports")
    public ResponseEntity<List<ReportResponseDTO>> getApprovedReportsForAssistantCommissioner(
            @RequestHeader("employee_id") String employeeId) {
        try {
            List<Report> reports = reportService.getApprovedReportsForAssistantCommissioner(employeeId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (RuntimeException e) {
            System.err.println("Error getting approved reports for Assistant Commissioner: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            System.err.println("Error getting reports: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/director-investigation/approved-reports")
    public ResponseEntity<List<ReportResponseDTO>> getReportsApprovedByAssistantCommissionerForDirectorInvestigation(
            @RequestHeader("employee_id") String directorId) {
        try {
            List<Report> reports = reportService.getReportsApprovedByAssistantCommissionerForDirectorInvestigation(directorId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (RuntimeException e) {
            System.err.println("Authorization error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            System.err.println("Error getting approved reports: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

//    @PostMapping("/{id}/assign-to-investigation-officer")
//    public ResponseEntity<ReportResponseDTO> assignToInvestigationOfficer(
//            @PathVariable Integer id,
//            @RequestParam(required = false) String specificOfficerId,
//            @RequestHeader("employee_id") String employeeId) {
//        try {
//            Employee assigner = employeeRepo.findByEmployeeId(employeeId)
//                    .orElseThrow(() -> new RuntimeException("Assigner not found"));
//
//            Report report = reportService.assignToInvestigationOfficer(id, specificOfficerId);
//            return ResponseEntity.ok(reportService.toResponseDTO(report));
//        } catch (Exception e) {
//            System.err.println("Error assigning report to investigation officer: " + e.getMessage());
//            e.printStackTrace();
//            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
//        }
//    }

    @PostMapping("/{id}/assign-to-investigation-officer")
    public ResponseEntity<ReportResponseDTO> assignToInvestigationOfficer(
            @PathVariable Integer id,
            @RequestBody Map<String, String> requestBody,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Employee assigner = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Assigner not found"));

            String specificOfficerId = requestBody.get("specificOfficerId");
            String assignmentNotes = requestBody.get("assignmentNotes");

            Report report = reportService.assignToInvestigationOfficer(id, specificOfficerId, assignmentNotes);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            log.error("Error assigning report to investigation officer: {}", e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/investigation-officers")
    public ResponseEntity<List<Employee>> getAvailableInvestigationOfficers(
            @RequestHeader("employee_id") String employeeId) {
        try {
            List<Employee> officers = reportService.getAvailableInvestigationOfficers();
            return ResponseEntity.ok(officers);
        } catch (Exception e) {
            System.err.println("Error getting investigation officers: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/investigation-officer/assigned-reports")
    public ResponseEntity<List<ReportResponseDTO>> getAssignedReportsForInvestigationOfficer(
            @RequestHeader("employee_id") String officerId) {
        try {
            List<Report> reports = reportService.getReportsAssignedToInvestigationOfficer(officerId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (RuntimeException e) {
            System.err.println("Error getting assigned reports: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            System.err.println("Error getting reports: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/findings")
    public ResponseEntity<ReportResponseDTO> getFindings(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Report report = reportService.getReport(id);

            Employee currentUser = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            boolean hasAccess = report.getCreatedBy().getEmployeeId().equals(employeeId) ||
                    (report.getCurrentRecipient() != null &&
                            report.getCurrentRecipient().getEmployeeId().equals(employeeId)) ||
                    reportRepo.DirectorsOfInvestigation().stream()
                            .anyMatch(d -> d.getEmployeeId().equals(employeeId))||
                    reportRepo.assistantCommissioner().stream()
                            .anyMatch(d-> d.getEmployeeId().equals(employeeId));

            if (!hasAccess) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            System.err.println("Error getting findings: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

//    @GetMapping("/director-investigation/all-reports")
//    public ResponseEntity<List<ReportResponseDTO>> getAllReportsForDirectorInvestigation(
//            @RequestHeader("employee_id") String directorId) {
//        try {
//            List<Report> reports = reportService.getAllReportsForDirectorInvestigation(directorId);
//            List<ReportResponseDTO> responseList = reports.stream()
//                    .map(reportService::toResponseDTO)
//                    .collect(Collectors.toList());
//            return ResponseEntity.ok(responseList);
//        } catch (RuntimeException e) {
//            System.err.println("Authorization error: " + e.getMessage());
//            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
//        } catch (Exception e) {
//            System.err.println("Error getting reports: " + e.getMessage());
//            e.printStackTrace();
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }

    private void validatePdfFile(MultipartFile file) {
        if (file == null || file.isEmpty()) return;

        // 1. File size validation
        if (file.getSize() > Long.parseLong(maxFileSize)) {
            throw new RuntimeException("File size exceeds maximum limit of " + maxFileSize + " bytes");
        }

        // 2. Filename validation with better sanitization
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            throw new RuntimeException("Invalid filename");
        }

        // Clean and validate filename
        originalFilename = StringUtils.cleanPath(originalFilename);
        if (!originalFilename.toLowerCase().endsWith(".pdf")) {
            throw new RuntimeException("Only PDF files are allowed");
        }

        // 3. Content type validation (multiple checks)
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new RuntimeException("Invalid file content type. Only PDF is allowed");
        }

        // 4. PDF magic number validation (binary header check)
        try {
            byte[] headerBytes = new byte[4];
            file.getInputStream().read(headerBytes);
            String header = new String(headerBytes);
            if (!header.equals("%PDF")) {
                throw new RuntimeException("File is not a valid PDF - corrupted or invalid format");
            }
        } catch (IOException e) {
            throw new RuntimeException("Unable to validate PDF file format", e);
        }

        // 5. Additional PDF structure validation
        validatePdfStructure(file);
    }

    private String extractOriginalFilename(String storedFilename) {
        // Extract original filename from stored UUID_filename.pdf format
        if (storedFilename == null) return "document.pdf";
        int underscoreIndex = storedFilename.indexOf('_');
        return underscoreIndex > 0 ? storedFilename.substring(underscoreIndex + 1) : storedFilename;
    }

    private void validatePdfStructure(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            // Read first 1024 bytes to check PDF structure
            byte[] buffer = new byte[1024];
            int bytesRead = inputStream.read(buffer);

            if (bytesRead < 8) {
                throw new RuntimeException("File too small to be a valid PDF");
            }

            String content = new String(buffer, 0, bytesRead);

            // Check for PDF version in header
            if (!content.startsWith("%PDF-1.")) {
                throw new RuntimeException("Invalid PDF header");
            }

            // Check if file appears to be text (might be corrupted PDF saved as text)
            if (content.contains("endobj") && content.contains("stream") &&
                    content.length() > 500 && content.matches(".*[\\x00-\\x08\\x0E-\\x1F\\x7F-\\xFF].*")) {
                throw new RuntimeException("PDF appears to be corrupted or saved as text file");
            }

        } catch (IOException e) {
            throw new RuntimeException("Error validating PDF structure", e);
        }
    }

    private String storePdfAttachment(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;

        // Ensure upload directory exists with proper permissions
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            // Set proper permissions (readable/writable by application only)
            try {
                Files.setPosixFilePermissions(uploadPath,
                        Set.of(PosixFilePermission.OWNER_READ,
                                PosixFilePermission.OWNER_WRITE,
                                PosixFilePermission.OWNER_EXECUTE));
            } catch (UnsupportedOperationException e) {
                // Windows doesn't support POSIX permissions
                log.warn("Unable to set POSIX permissions on Windows");
            }
        }

        // Generate secure filename
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        String secureFilename = UUID.randomUUID().toString() + fileExtension;

        Path filePath = uploadPath.resolve(secureFilename);

        // Path traversal protection
        if (!filePath.normalize().startsWith(uploadPath)) {
            throw new IOException("Invalid file path - security violation");
        }

        // Store file with proper error handling and verification
        try {
            // Copy file in binary mode to prevent corruption
            Files.copy(file.getInputStream(), filePath,
                    StandardCopyOption.REPLACE_EXISTING);

            // Verify file was written correctly
            if (!Files.exists(filePath) || Files.size(filePath) != file.getSize()) {
                throw new IOException("File storage verification failed");
            }

            // Additional PDF integrity check after storage
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

    private void validateAttachmentAccess(Report report, String employeeId) {
        // 1. Basic validation
        if (report == null) {
            throw new RuntimeException("Report not found");
        }

        if (employeeId == null || employeeId.trim().isEmpty()) {
            throw new RuntimeException("Employee ID is required");
        }

        // 2. Check if employee is the creator of the report
        if (report.getCreatedBy() != null &&
                employeeId.equals(report.getCreatedBy().getEmployeeId())) {
            return; // Creator has full access
        }

        // 3. Check if employee is the current recipient
        if (report.getCurrentRecipient() != null &&
                employeeId.equals(report.getCurrentRecipient().getEmployeeId())) {
            return; // Current recipient has access
        }

        // 4. Check if employee is a director of investigation
        List<Employee> directors = reportRepo.DirectorsOfInvestigation();
        boolean isDirector = directors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));
        if (isDirector) {
            return; // Directors have access to all reports
        }

        // 5. Check if employee is an investigation officer assigned to this report
        if (report.getInvestigationOfficer() != null &&
                employeeId.equals(report.getInvestigationOfficer().getEmployeeId())) {
            return; // Assigned investigation officer has access
        }

        // 6. Check if employee is a director of intelligence
        List<Employee> intelDirectors = reportRepo.DirectorsOfIntelligence();
        boolean isIntelDirector = intelDirectors.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));
        if (isIntelDirector) {
            return; // Intelligence directors have access
        }

        // 7. Check if employee is an assistant commissioner
        List<Employee> commissioners = reportRepo.assistantCommissioner();
        boolean isCommissioner = commissioners.stream()
                .anyMatch(d -> d.getEmployeeId().equals(employeeId));
        if (isCommissioner) {
            return; // Assistant commissioners have access
        }

        // If none of the above conditions are met, access is denied
        throw new RuntimeException("You do not have permission to access this attachment");
    }

    private void verifyStoredPdf(Path filePath) throws IOException {
        try (InputStream fileStream = Files.newInputStream(filePath)) {
            byte[] header = new byte[8];
            int bytesRead = fileStream.read(header);

            if (bytesRead < 8) {
                throw new IOException("Stored file is too small");
            }

            String headerStr = new String(header, 0, 4);
            if (!headerStr.equals("%PDF")) {
                throw new IOException("Stored file lost PDF format - corruption detected");
            }

            if (bytesRead >= 8) {
                String version = new String(header, 5, 3);
                try {
                    float versionNum = Float.parseFloat(version);
                    if (versionNum < 1.0 || versionNum > 1.7) {
                        throw new IOException("Unsupported PDF version: " + version);
                    }
                } catch (NumberFormatException e) {
                    throw new IOException("Invalid PDF version format");
                }
            }
        }
    }
    @GetMapping("/download/{reportId}/{filename}")
    public ResponseEntity<Resource> downloadReportAttachment(
            @PathVariable Integer reportId,
            @PathVariable String filename,
            @RequestParam String requesterId) {

        return reportService.downloadReportAttachment(reportId, filename, requesterId);
    }

    @GetMapping("/by-case")
    public ResponseEntity<List<ReportResponseDTO>> getReportsByCaseNum(
            @RequestParam String caseNum,
            @RequestHeader("employee_id") String employeeId) {

        try {
            log.info("Fetching reports for case: {}", caseNum);
            Case relatedCase = caseRepo.findByCaseNum(caseNum)
                    .orElseThrow(() -> {
                        log.warn("Case not found: {}", caseNum);
                        return new RuntimeException("Case not found");
                    });

            // 3. Get and return reports
            List<Report> reports = reportService.getReportsByCaseNum(caseNum);
            List<ReportResponseDTO> response = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());

            log.info("Found {} reports for case {}", response.size(), caseNum);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("Error getting reports for case {}: {}", caseNum, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("System error getting reports for case {}: {}", caseNum, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/director-intelligence/all-reports")
    public ResponseEntity<List<ReportResponseDTO>> getAllReportsForDirectorIntelligence(
            @RequestHeader("employee_id") String directorId) {
        try {
            List<Report> reports = reportService.getAllReportsForDirectorIntelligence(directorId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (RuntimeException e) {
            log.error("Authorization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error getting reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/assistant-commissioner/all-reports")
    public ResponseEntity<List<ReportResponseDTO>> getAllReportsForAssistantCommissioner(
            @RequestHeader("employee_id") String employeeId) {
        try {
            List<Report> reports = reportService.getReportsHandledByAssistantCommissioner(employeeId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (RuntimeException e) {
            log.error("Authorization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error getting reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/director-investigation/all-reports")
    public ResponseEntity<List<ReportResponseDTO>> getAllReportsForDirectorInvestigation(
            @RequestHeader("employee_id") String directorId) {
        try {
            List<Report> reports = reportService.getReportsHandledByDirectorInvestigation(directorId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (RuntimeException e) {
            log.error("Authorization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error getting reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/update-returned-report")
    public ResponseEntity<ReportResponseDTO> updateReturnedReport(
            @PathVariable Integer id,
            @RequestBody ReportRequestDTO reportData,
            @RequestHeader("employee_id") String employeeId) {
        try {
            // Verify the employee is the creator of the report
            Report report = reportService.getReport(id);
            if (!report.getCreatedBy().getEmployeeId().equals(employeeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            // Verify the report is in a returned status
            if (!isReportReturned(report)) {
                return ResponseEntity.badRequest().body(null);
            }

            Report updatedReport = reportService.updateReturnedReport(id, reportData);
            return ResponseEntity.ok(reportService.toResponseDTO(updatedReport));
        } catch (RuntimeException e) {
            log.error("Error updating returned report: {}", e.getMessage());
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            log.error("System error updating returned report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private boolean isReportReturned(Report report) {
        return report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_INTELLIGENCE_OFFICER ||
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION;
    }

    @GetMapping("/assistant-commissioner/fines-report")
    public ResponseEntity<FinesReportDTO> getFinesReportForAssistantCommissioner(
            @RequestHeader("employee_id") String employeeId) {
        try {
            FinesReportDTO reportDTO = reportService.generateFinesReportForAssistantCommissioner(employeeId);
            return ResponseEntity.ok(reportDTO);
        } catch (RuntimeException e) {
            log.error("Authorization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error generating fines report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/director-intelligence/case-reports")
    public ResponseEntity<List<DirectorIntelligenceReportDTO>> getDirectorIntelligenceCaseReports(
            @RequestHeader("employee_id") String directorId) {
        try {
            List<DirectorIntelligenceReportDTO> reports = reportService.getDirectorIntelligenceReport(directorId);
            return ResponseEntity.ok(reports);
        } catch (RuntimeException e) {
            log.error("Authorization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error generating director intelligence report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/t3-officers-reports")
    public ResponseEntity<List<OfficerReportsDTO>> getReportsByT3Officers() {
        try {
            List<OfficerReportsDTO> reports = reportService.getReportsByT3Officers();
            return ResponseEntity.ok(reports);
        } catch (Exception e) {
            log.error("Error getting T3 officers reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}