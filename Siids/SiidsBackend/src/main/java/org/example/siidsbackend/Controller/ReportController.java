package org.example.siidsbackend.Controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.DirectorIntelligenceReportDTO;
import org.example.siidsbackend.DTO.FinesReportDTO;
import org.example.siidsbackend.DTO.OfficerReportsDTO;
import org.example.siidsbackend.DTO.Request.FindingsRequestDTO;
import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Request.SignReportRequest;
import org.example.siidsbackend.DTO.Response.PageResponseDTO;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.CaseRepo;

import org.example.siidsbackend.Repository.ReportRepo;
import org.example.siidsbackend.Service.FileStorageService;
import org.example.siidsbackend.Service.PdfService;
import org.example.siidsbackend.Service.RbacService;
import org.example.siidsbackend.Service.ReportService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {
    private static final String ADMIN_OR_REPORT_APPROVE_INTELLIGENCE =
            "hasAuthority('REPORT_APPROVE_INTELLIGENCE') or hasRole('ADMIN') or hasAuthority('Admin') or hasAuthority('ADMIN')";

    private final ReportService reportService;

    private final ReportRepo reportRepo;
    private final CaseRepo caseRepo;
    private final ObjectMapper objectMapper;
    private final org.example.siidsbackend.Repository.UserRepo userRepo;
    private final RbacService rbacService;
    private final FileStorageService fileStorageService;
    private final PdfService pdfService;

    @Value("${file.max-size:10485760}")
    private String maxFileSize;

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("application/pdf");

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('REPORT_CREATE')")
    public ResponseEntity<?> createReport(
            @RequestPart("reportData") String reportDataJson,
            @RequestPart(value = "attachments", required = false) MultipartFile[] attachments, // Change to array
            Authentication authentication) {
        String employeeId = authentication.getName();

        try {
            ReportRequestDTO reportData = objectMapper.readValue(reportDataJson, ReportRequestDTO.class);

            if (reportData.getDescription() == null || reportData.getDescription().trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            List<String> attachmentPaths = new ArrayList<>();
            if (attachments != null && attachments.length > 0) {
                for (MultipartFile attachment : attachments) {
                    if (!attachment.isEmpty()) {
                        validatePdfFile(attachment);
                        String attachmentPath = storePdfAttachment(attachment);
                        attachmentPaths.add(attachmentPath);
                    }
                }
            }

            Report report = reportService.createReport(reportData, attachmentPaths, employeeId); // Pass list
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Validation error creating report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error creating report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/attachment")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<?> downloadAttachment(
            @PathVariable Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();

        try {
            Report report = reportService.getReport(id);
            validateAttachmentAccess(report, employeeId);

            if (report.getAttachmentPath() == null || report.getAttachmentPath().trim().isEmpty()) {
                log.warn("Empty attachment path for report {}", id);
                return ResponseEntity.notFound().build();
            }

            log.info("Attachment path from DB: {}", report.getAttachmentPath());

            Path filePath = fileStorageService.resolveStoredPath(report.getAttachmentPath());

            log.info("File path resolved: {}", filePath);
            log.info("File exists: {}", Files.exists(filePath));
            log.info("File is readable: {}", Files.isReadable(filePath));
            log.info("File size: {}", Files.exists(filePath) ? Files.size(filePath) : "N/A");

            if (!Files.exists(filePath)) {
                log.error("File not found: {}", filePath);
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
    @PreAuthorize("hasAuthority('REPORT_CREATE')")
    public ResponseEntity<?> submitFindings(
            @PathVariable Integer id,
            @RequestPart("findingsData") String findingsDataJson,
            @RequestPart(value = "attachments", required = false) MultipartFile[] attachments,
            Authentication authentication) {
        String officerId = authentication.getName();
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            FindingsRequestDTO findingsDTO = objectMapper.readValue(findingsDataJson, FindingsRequestDTO.class);

            // Convert array to list for service method
            List<MultipartFile> attachmentsList = attachments != null ? Arrays.asList(attachments) : new ArrayList<>();
            findingsDTO.setAttachmentsList(attachmentsList);

            Report report = reportService.submitFindings(id, findingsDTO, officerId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error submitting findings: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("System error submitting findings: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/findings-attachments/by-name/{filename}")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<?> downloadFindingsAttachmentByName(
            @PathVariable Integer id,
            @PathVariable String filename,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.getReport(id);
            validateAttachmentAccess(report, employeeId);

            if (report.getFindingsAttachmentPaths() == null ||
                    !report.getFindingsAttachmentPaths().contains(filename)) {
                return ResponseEntity.notFound().build();
            }

            Path filePath = fileStorageService.resolveStoredPath(filename);
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
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<List<ReportResponseDTO>> getMyReports(
            Authentication authentication) {
        String employeeId = authentication.getName();
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
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<ReportResponseDTO> getReport(
            @PathVariable Integer id,
            Authentication authentication) {
        try {
            return ResponseEntity.ok(reportService.getReportResponse(id));
        } catch (Exception e) {
            System.err.println("Error getting report: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/{id}/sign")
    @PreAuthorize("hasAnyAuthority('REPORT_APPROVE_INTELLIGENCE', 'REPORT_APPROVE_ASSISTANT_COMMISSIONER')")
    public ResponseEntity<?> signReport(
            @PathVariable Integer id,
            @RequestBody SignReportRequest request,
            Authentication authentication) {
        try {
            return ResponseEntity.ok(reportService.signReportAndMapResponse(id, request, authentication.getName()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/investigation-report-pdf")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<?> downloadInvestigationReportPdf(@PathVariable Integer id) {
        try {
            Report report = reportRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Report not found with ID: " + id));
            byte[] pdf = pdfService.generateInvestigationReport(report);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"InvestigationReport-" + id + ".pdf\"")
                    .body(pdf);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error generating investigation report PDF for report {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Failed to generate report PDF"));
        }
    }

    @GetMapping("/{id}/participants")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<Map<String, String>> getReportParticipants(
            @PathVariable Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.getReport(id);

            // Check access permissions
            boolean isDirector = reportRepo.DirectorsOfInvestigation().stream()
                    .anyMatch(d -> d.getEmployeeId().equals(employeeId));

            // Check if employee is Admin
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
            boolean isAdmin = rbacService.isAdmin(user);

            boolean hasAccess = isAdmin || report.getCreatedBy().getEmployeeId().equals(employeeId) ||
                    (report.getCurrentRecipient() != null &&
                            report.getCurrentRecipient().getEmployeeId().equals(employeeId))
                    ||
                    isDirector;

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
    @PreAuthorize("hasAuthority('REPORT_CREATE')")
    public ResponseEntity<?> sendToDirectorIntelligence(
            @PathVariable("id") Integer reportId,
            Authentication authentication) {
        try {

            Report report = reportService.sendToDirectorIntelligence(reportId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            log.error("Error sending to Director of Intelligence: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/send-to-commissioner-intelligence")
    @PreAuthorize(ADMIN_OR_REPORT_APPROVE_INTELLIGENCE)
    public ResponseEntity<?> sendToAssistantCommissioner(
            @PathVariable Integer id,
            Authentication authentication) {
        try {

            return ResponseEntity.ok(reportService.sendToAssistantCommissionerResponse(id));
        } catch (Exception e) {
            log.error("Error sending to Assistant Commissioner: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/send-to-director-investigation")
    @PreAuthorize(ADMIN_OR_REPORT_APPROVE_INTELLIGENCE)
    public ResponseEntity<?> sendToDirectorInvestigation(
            @PathVariable("id") Integer reportId,
            Authentication authentication) {
        try {

            return ResponseEntity.ok(reportService.sendToDirectorInvestigationResponse(reportId));
        } catch (Exception e) {
            log.error("Error sending to Director of Investigation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAnyAuthority('REPORT_APPROVE_INTELLIGENCE', 'REPORT_APPROVE_INVESTIGATION', 'REPORT_APPROVE_ASSISTANT_COMMISSIONER', 'LEGAL_REVIEW')")
    public ResponseEntity<?> returnReport(
            @PathVariable Integer id,
            @RequestParam String returnToEmployeeId,
            @RequestParam String returnReason,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {

            if (returnReason == null || returnReason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(null);
            }

            return ResponseEntity.ok(reportService.returnReportResponse(id, returnReason, returnToEmployeeId, employeeId));
        } catch (RuntimeException e) {
            log.error("Error returning report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("System error returning report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @GetMapping("/director-intelligence/reports")
    @PreAuthorize(ADMIN_OR_REPORT_APPROVE_INTELLIGENCE)
    public ResponseEntity<?> getReportsForDirectorIntelligence(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "desc") String sort,
            Authentication authentication) {
        String directorId = authentication.getName();
        try {
            return ResponseEntity.ok(reportService.getReportPageForDirectorIntelligence(directorId, page, size, search, sort));
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
    @PreAuthorize(ADMIN_OR_REPORT_APPROVE_INTELLIGENCE)
    public ResponseEntity<?> approveReport(
            @PathVariable Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {

            return ResponseEntity.ok(reportService.approveReportResponse(id, employeeId));
        } catch (Exception e) {
            log.error("Error approving report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize(ADMIN_OR_REPORT_APPROVE_INTELLIGENCE)
    public ResponseEntity<?> rejectReport(
            @PathVariable Integer id,
            @RequestParam(required = false) String rejectionReason,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {

            return ResponseEntity.ok(reportService.rejectReportResponse(id, rejectionReason, employeeId));
        } catch (Exception e) {
            log.error("Error rejecting report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/assistant-commissioner/approved-reports")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_ASSISTANT_COMMISSIONER')")
    public ResponseEntity<PageResponseDTO<ReportResponseDTO>> getApprovedReportsForAssistantCommissioner(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "INTAKE") String view,
            Authentication authentication) {
        try {
            String employeeId = authentication.getName();
            return ResponseEntity.ok(reportService.getApprovedReportPageForAssistantCommissioner(
                    employeeId,
                    page,
                    size,
                    search,
                    view));
        } catch (RuntimeException e) {
            log.error("Authorization error fetching AC reports: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            System.err.println("Error getting reports: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/director-investigation/approved-reports")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<PageResponseDTO<ReportResponseDTO>> getReportsApprovedByAssistantCommissionerForDirectorInvestigation(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String view,
            Authentication authentication) {
        String directorId = authentication.getName();
        try {
            return ResponseEntity.ok(reportService.getReportPageForDirectorInvestigation(
                    directorId,
                    page,
                    size,
                    search,
                    view));
        } catch (RuntimeException e) {
            System.err.println("Authorization error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            System.err.println("Error getting approved reports: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/{id}/investigation-status")
    @PreAuthorize("hasAuthority('REPORT_CREATE')")
    public ResponseEntity<?> updateInvestigationStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> payload,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            String status = payload.get("status");
            String notes = payload.get("notes");
            Report updatedReport = reportService.updateInvestigationStatus(id, status, notes, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(updatedReport));
        } catch (Exception e) {
            log.error("Error updating investigation status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/assign-to-investigation-officer")
    @PreAuthorize("hasAuthority('REPORT_ASSIGN_INVESTIGATION')")
    public ResponseEntity<?> assignToInvestigationOfficer(
            @PathVariable Integer id,
            @RequestBody Map<String, String> requestBody,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {

            String specificOfficerId = requestBody.get("specificOfficerId");
            String assignmentNotes = requestBody.get("assignmentNotes");

            Report report = reportService.assignToInvestigationOfficer(id, specificOfficerId, assignmentNotes, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            log.error("Error assigning report to investigation officer: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping({"/available-investigation-officers", "/investigation-officers"})
    @PreAuthorize("hasAuthority('REPORT_ASSIGN_INVESTIGATION')")
    public ResponseEntity<List<Employee>> getAvailableInvestigationOfficersWithHeader(
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            List<Employee> officers = reportService.getAvailableInvestigationOfficers();
            return ResponseEntity.ok(officers);
        } catch (Exception e) {
            System.err.println("Error getting investigation officers: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/investigation-officer/dashboard-worklist")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<List<ReportResponseDTO>> getAssignedReportsForInvestigationOfficer(
            Authentication authentication) {
        String officerId = authentication.getName();
        try {
            log.info("API: Fetching operational worklist for IO: {}", officerId);
            List<Report> reports = reportService.fetchDashboardDataForIO(officerId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            log.error("CRITICAL: Error getting reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    //
    @GetMapping("/{id}/findings")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<ReportResponseDTO> getFindings(
            @PathVariable Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.getReport(id);

            // Check access permissions
            boolean hasAccess =
                    // Creator has access
                    report.getCreatedBy().getEmployeeId().equals(employeeId) ||
                    // Current recipient has access
                            (report.getCurrentRecipient() != null &&
                                    report.getCurrentRecipient().getEmployeeId().equals(employeeId))
                            ||
                            // Director of Investigation has access
                            reportRepo.DirectorsOfInvestigation().stream()
                                    .anyMatch(d -> d.getEmployeeId().equals(employeeId))
                            ||
                            // Assistant Commissioner has access
                            reportRepo.assistantCommissioner().stream()
                                    .anyMatch(d -> d.getEmployeeId().equals(employeeId))
                            ||
                            // Investigation officer (current or former) has access
                            (report.getInvestigationOfficer() != null &&
                                    report.getInvestigationOfficer().getEmployeeId().equals(employeeId));

            if (!hasAccess) {
                org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
                if (rbacService.isAdmin(user)) {
                    hasAccess = true;
                }
            }

            if (!hasAccess) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            log.error("Error getting findings: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    private void validatePdfFile(MultipartFile file) {
        if (file == null || file.isEmpty())
            return;

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
        if (storedFilename == null)
            return "document.pdf";
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

            // Check for PDF version in header - support both 1.x and 2.x versions
            if (!content.startsWith("%PDF-1.") && !content.startsWith("%PDF-2.")) {
                throw new RuntimeException("Invalid PDF header or unsupported version");
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
        if (file == null || file.isEmpty())
            return null;

        String storedPath = fileStorageService.storePdf(file, null);
        Path filePath = fileStorageService.resolveStoredPath(storedPath);
        try {
            // Verify file was written correctly
            if (!Files.exists(filePath) || Files.size(filePath) != file.getSize()) {
                throw new IOException("File storage verification failed");
            }

            // Additional PDF integrity check after storage
            verifyStoredPdf(filePath);

            return storedPath;

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

        // Check if employee has a privileged role
        org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
        if (user != null) {
            if (rbacService.hasAnyRole(user,
                    "Admin",
                    "DirectorIntelligence",
                    "DirectorInvestigation",
                    "InvestigationOfficer",
                    "AssistantCommissioner",
                    "LegalAdvisor")) {
                return; // Privileged role has access
            }
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
                    // Standard PDF versions are 1.x (up to 1.7) and 2.0. 
                    // Using 2.1 as upper bound to handle precision safely and support minor future revisions.
                    if (versionNum < 1.0 || versionNum > 2.1) {
                        throw new IOException("Unsupported PDF version: " + version);
                    }
                } catch (NumberFormatException e) {
                    throw new IOException("Invalid PDF version format");
                }
            }
        }
    }

    @GetMapping("/download/{reportId}/{filename}")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<Resource> downloadReportAttachment(
            @PathVariable Integer reportId,
            @PathVariable String filename,
            Authentication authentication) {

        String requesterId = authentication.getName();
        try {
            return reportService.downloadReportAttachment(reportId, filename, requesterId);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @GetMapping("/{reportId}/attachments")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<Resource> downloadReportAttachmentByName(
            @PathVariable Integer reportId,
            @RequestParam String filename,
            Authentication authentication) {

        String requesterId = authentication.getName();
        try {
            return reportService.downloadReportAttachment(reportId, filename, requesterId);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @GetMapping("/by-case")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<List<ReportResponseDTO>> getReportsByCaseNum(
            @RequestParam String caseNum,
            Authentication authentication) {
        try {
            log.info("Fetching reports for case: {}", caseNum);
            caseRepo.findByCaseNum(caseNum)
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
    @PreAuthorize(ADMIN_OR_REPORT_APPROVE_INTELLIGENCE)
    public ResponseEntity<List<ReportResponseDTO>> getAllReportsForDirectorIntelligence(
            Authentication authentication) {
        String directorId = authentication.getName();
        try {
            return ResponseEntity.ok(reportService.getAllReportDtosForDirectorIntelligence(directorId));
        } catch (RuntimeException e) {
            log.error("Authorization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error getting reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/assistant-commissioner/all-reports")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_ASSISTANT_COMMISSIONER')")
    public ResponseEntity<List<ReportResponseDTO>> getAllReportsForAssistantCommissioner(
            Authentication authentication) {
        String employeeId = authentication.getName();
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
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<List<ReportResponseDTO>> getAllReportsForDirectorInvestigation(
            Authentication authentication) {
        String directorId = authentication.getName();
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
    @PreAuthorize("hasAuthority('REPORT_CREATE')")
    public ResponseEntity<ReportResponseDTO> updateReturnedReport(
            @PathVariable Integer id,
            @RequestBody ReportRequestDTO reportData,
            Authentication authentication) {
        String employeeId = authentication.getName();
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
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION ||
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE ||
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_ASSISTANT_COMMISSIONER ||
                report.getRelatedCase().getStatus() == WorkflowStatus.REPORT_RETURNED_TO_INVESTIGATION_OFFICER;
    }

    @GetMapping("/assistant-commissioner/fines-report")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_ASSISTANT_COMMISSIONER')")
    public ResponseEntity<FinesReportDTO> getFinesReportForAssistantCommissioner(
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            FinesReportDTO reportDTO = reportService.generateFinesReportForAssistantCommissioner(employeeId);
            return ResponseEntity.ok(reportDTO);
        } catch (RuntimeException e) {
            log.error("Authorization error for fines report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error generating fines report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/assistant-commissioner/penalties-report")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_ASSISTANT_COMMISSIONER')")
    public ResponseEntity<FinesReportDTO> getPenaltiesReportForAssistantCommissioner(
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            FinesReportDTO reportDTO = reportService.generatePenaltiesReportForAssistantCommissioner(employeeId);
            return ResponseEntity.ok(reportDTO);
        } catch (RuntimeException e) {
            log.error("Authorization error for penalties report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error generating penalties report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/director-intelligence/case-reports")
    @PreAuthorize(ADMIN_OR_REPORT_APPROVE_INTELLIGENCE)
    public ResponseEntity<List<DirectorIntelligenceReportDTO>> getDirectorIntelligenceCaseReports(
            Authentication authentication) {
        String directorId = authentication.getName();
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
    @PreAuthorize("hasAuthority('REPORT_ASSIGN_INVESTIGATION')")
    public ResponseEntity<List<OfficerReportsDTO>> getReportsByT3Officers() {
        try {
            List<OfficerReportsDTO> reports = reportService.getReportsByT3Officers();
            return ResponseEntity.ok(reports);
        } catch (Exception e) {
            log.error("Error getting T3 officers reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{id}/receive-case")
    @PreAuthorize("hasAuthority('REPORT_CREATE')")
    public ResponseEntity<ReportResponseDTO> receiveCase(
            @PathVariable Integer id,
            Authentication authentication) {
        String officerId = authentication.getName();
        try {
            Report report = reportService.receiveCase(id, officerId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            log.error("Error receiving case: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/investigation-officer/active-reports")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<PageResponseDTO<ReportResponseDTO>> getActiveReportsForInvestigationOfficer(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search,
            Authentication authentication) {
        String officerId = authentication.getName();
        try {
            return ResponseEntity.ok(reportService.getInvestigationOfficerReportPage(officerId, true, page, size, search));
        } catch (RuntimeException e) {
            log.error("Error getting active reports: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error getting reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/investigation-officer/all-reports")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<PageResponseDTO<ReportResponseDTO>> getAllReportsForInvestigationOfficer(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search,
            Authentication authentication) {
        String officerId = authentication.getName();
        try {
            return ResponseEntity.ok(reportService.getInvestigationOfficerReportPage(officerId, false, page, size, search));
        } catch (RuntimeException e) {
            log.error("Error getting all reports: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error getting reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/investigation-officers/assigned-reports")
    @PreAuthorize("hasAuthority('REPORT_ASSIGN_INVESTIGATION')")
    public ResponseEntity<List<ReportResponseDTO>> getReportsAssignedToInvestigationOfficers(
            @RequestParam String employeeId) {
        try {
            // First verify the employee is a T3 officer
            List<Employee> t3Officers = reportRepo.findAvailableT3Officers();
            boolean isT3Officer = t3Officers.stream()
                    .anyMatch(o -> o.getEmployeeId().equals(employeeId));

            if (!isT3Officer) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            List<Report> reports = reportService.getReportsAssignedToInvestigationOfficers(employeeId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            log.error("Error getting assigned reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{id}/send")
    @PreAuthorize("hasAnyAuthority('REPORT_APPROVE_ASSISTANT_COMMISSIONER', 'REPORT_APPROVE_INVESTIGATION', 'REPORT_APPROVE_INTELLIGENCE')")
    public ResponseEntity<?> sendReportToDepartment(
            @PathVariable Integer id,
            @RequestBody Map<String, String> request) {

        try {
            String department = request.get("Department");
            reportService.sendReportToDepartment(id, department);
            return ResponseEntity.ok("Report sent to " + department);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to send report: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/send-to-legal-advisor")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_ASSISTANT_COMMISSIONER')")
    public ResponseEntity<ReportResponseDTO> sendToLegalAdvisor(
            @PathVariable Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            log.info("Sending report {} to legal advisor, requested by employee {}", id, employeeId);
            Report report = reportService.sendToLegalAdvisor(id);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            log.error("Error in sendToLegalAdvisor for report {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .header("X-Error-Message", e.getMessage())
                    .body(null);
        }
    }

    @GetMapping("/legal-advisor/my-reports")
    @PreAuthorize("hasAuthority('LEGAL_REVIEW')")
    public ResponseEntity<PageResponseDTO<ReportResponseDTO>> getReportsForLegalAdvisor(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search,
            Authentication authentication) {
        String legalAdvisorId = authentication.getName();
        try {
            return ResponseEntity.ok(reportService.getLegalAdvisorReportPage(legalAdvisorId, page, size, search));
        } catch (RuntimeException e) {
            log.error("Authorization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error getting legal advisor reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/legal-advisor/all-reports")
    @PreAuthorize("hasAuthority('LEGAL_REVIEW')")
    public ResponseEntity<List<ReportResponseDTO>> getAllReportsWithLegalAdvisors() {
        try {
            List<Report> reports = reportService.getAllReportsWithLegalAdvisors();
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            log.error("Error getting all legal advisor reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{id}/return-to-assistant-commissioner")
    @PreAuthorize("hasAuthority('LEGAL_REVIEW')")
    public ResponseEntity<?> returnToAssistantCommissioner(
            @PathVariable Integer id,
            @RequestBody Map<String, String> requestBody,
            Authentication authentication) {
        String legalAdvisorId = authentication.getName();
        try {
            // Verify the user is a legal advisor
            List<Employee> legalAdvisors = reportRepo.findLegalAdvisors();
            boolean isLegalAdvisor = legalAdvisors.stream()
                    .anyMatch(la -> la.getEmployeeId().equals(legalAdvisorId));

            if (!isLegalAdvisor) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String returnReason = requestBody.get("returnReason");

            if (returnReason == null || returnReason.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            Report report = reportService.returnToAssistantCommissioner(id, returnReason, legalAdvisorId);

            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error returning report to assistant commissioner: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Collections.singletonMap("message", e.getMessage()));
        } catch (Exception e) {
            log.error("System error returning report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Collections.singletonMap("message", "An unexpected system error occurred"));
        }
    }

    @PostMapping(value = "/{id}/return-with-document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('REPORT_APPROVE_INTELLIGENCE', 'REPORT_APPROVE_INVESTIGATION', 'REPORT_APPROVE_ASSISTANT_COMMISSIONER', 'LEGAL_REVIEW')")
    public ResponseEntity<ReportResponseDTO> returnReportWithDocument(
            @PathVariable Integer id,
            @RequestParam String returnToEmployeeId,
            @RequestParam(required = false) String returnReason,
            @RequestPart(value = "returnDocument", required = false) MultipartFile returnDocument,
            Authentication authentication) {
        String employeeId = authentication.getName();

        try {

            // Validate at least one reason is provided
            if ((returnReason == null || returnReason.trim().isEmpty()) && returnDocument == null) {
                return ResponseEntity.badRequest().body(null);
            }

            if (returnDocument != null && !returnDocument.isEmpty()) {
                String originalFilename = returnDocument.getOriginalFilename();

                if (originalFilename != null) {
                    String lowerFilename = originalFilename.toLowerCase();
                    if (!lowerFilename.endsWith(".doc") &&
                            !lowerFilename.endsWith(".docx") &&
                            !lowerFilename.endsWith(".pdf") &&
                            !lowerFilename.endsWith(".txt")) {
                        return ResponseEntity.badRequest().body(null);
                    }
                }
            }

            // Create combined reason
            String combinedReason = (returnReason == null || returnReason.trim().isEmpty())
                    ? "Document attached"
                    : returnReason.trim();

            Report report = reportService.returnReport(id, combinedReason, returnToEmployeeId, employeeId, returnDocument);

            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error returning report with document: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        } catch (Exception e) {
            log.error("Error returning report with document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    private String storeReturnDocument(MultipartFile file) throws IOException {
        return fileStorageService.store(file, "return-documents", Set.of(".pdf", ".doc", ".docx", ".txt"));
    }

    @GetMapping("/{id}/return-document")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<Resource> downloadReturnDocument(
            @PathVariable Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();

        try {
            Report report = reportService.getReport(id);
            validateAttachmentAccess(report, employeeId);

            if (report.getReturnDocumentPath() == null) {
                return ResponseEntity.notFound().build();
            }

            Path filePath = fileStorageService.resolveStoredPath(report.getReturnDocumentPath());

            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            // Determine content type
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                String filename = report.getReturnDocumentPath();
                if (filename.endsWith(".doc")) {
                    contentType = "application/msword";
                } else if (filename.endsWith(".docx")) {
                    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                } else if (filename.endsWith(".pdf")) {
                    contentType = "application/pdf";
                } else if (filename.endsWith(".txt")) {
                    contentType = "text/plain";
                } else {
                    contentType = "application/octet-stream";
                }
            }

            String filename = report.getReturnDocumentOriginalName() != null ? report.getReturnDocumentOriginalName()
                    : "return-document" + getFileExtension(report.getReturnDocumentPath());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename.replace("\"", "") + "\"")
                    .body(resource);

        } catch (Exception e) {
            log.error("Error downloading return document: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null)
            return "";
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot) : "";
    }

    @PutMapping("/{id}/edit")
    @PreAuthorize("hasAuthority('REPORT_CREATE')")
    public ResponseEntity<?> editReport(
            @PathVariable Integer id,
            @RequestPart("reportData") String reportDataJson,
            @RequestPart(value = "attachments", required = false) MultipartFile[] attachments,
            Authentication authentication) {
        String employeeId = authentication.getName();

        try {
            ReportRequestDTO reportData = objectMapper.readValue(reportDataJson, ReportRequestDTO.class);

            // Validate input
            if (reportData.getDescription() == null || reportData.getDescription().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Report description is required"));
            }

            // Check if editing is allowed (report must be in returned status)
            Report existingReport = reportService.getReport(id);
            if (!reportService.canEditReport(existingReport, employeeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "You are not authorized to edit this report or it is no longer returned"));
            }

            // Process new attachments if provided
            List<String> newAttachmentPaths = new ArrayList<>();
            if (attachments != null && attachments.length > 0) {
                for (MultipartFile attachment : attachments) {
                    if (!attachment.isEmpty()) {
                        validatePdfFile(attachment);
                        String attachmentPath = storePdfAttachment(attachment);
                        newAttachmentPaths.add(attachmentPath);
                    }
                }
            }

            ReportResponseDTO updatedReport = reportService.editReturnedReport(
                    id,
                    reportData,
                    newAttachmentPaths,
                    employeeId,
                    existingReport.getReturnReason() // Pass the return reason for context
            );

            return ResponseEntity.ok(updatedReport);

        } catch (RuntimeException e) {
            log.error("Validation error editing report: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error editing report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Internal system error while updating report: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/edit-permission")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ResponseEntity<Map<String, Object>> checkEditPermission(
            @PathVariable Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();

        try {
            Report report = reportService.getReport(id);
            Map<String, Object> response = new HashMap<>();

            boolean canEdit = reportService.canEditReport(report, employeeId);
            response.put("canEdit", canEdit);

            if (canEdit) {
                response.put("returnReason", report.getReturnReason());
                response.put("returnedBy",
                        report.getReturnedBy() != null
                                ? report.getReturnedBy().getGivenName() + " " + report.getReturnedBy().getFamilyName()
                                : null);
                response.put("returnedAt", report.getReturnedAt());

                // Provide guidance based on return reason
                if (report.getReturnReason() != null && !report.getReturnReason().trim().isEmpty()) {
                    response.put("editGuidance", generateEditGuidance(report.getReturnReason()));
                }
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error checking edit permission: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String generateEditGuidance(String returnReason) {
        // Generate helpful guidance based on common return reasons
        String lowerReason = returnReason.toLowerCase();

        if (lowerReason.contains("insufficient") || lowerReason.contains("inadequate")) {
            return "Please provide more detailed information and evidence.";
        } else if (lowerReason.contains("incorrect") || lowerReason.contains("wrong")) {
            return "Please review and correct the factual information.";
        } else if (lowerReason.contains("missing") || lowerReason.contains("lack")) {
            return "Please add the missing information or attachments.";
        } else if (lowerReason.contains("format") || lowerReason.contains("structure")) {
            return "Please reformat the report according to the required structure.";
        } else if (lowerReason.contains("clarity") || lowerReason.contains("unclear")) {
            return "Please clarify the language and make the report more understandable.";
        } else if (lowerReason.contains("attachment") || lowerReason.contains("document")) {
            return "Please add or update the required attachments.";
        } else if (lowerReason.contains("evidence") || lowerReason.contains("proof")) {
            return "Please provide stronger supporting evidence.";
        }

        return "Please address the issues mentioned in the return reason.";
    }

    @PostMapping(value = "/{id}/submit-case-plan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('REPORT_CREATE')")
    public ResponseEntity<?> submitCasePlan(
            @PathVariable Integer id,
            @RequestPart(value = "casePlanText", required = false) String casePlanDescription,
            @RequestPart(value = "casePlanAttachment", required = false) MultipartFile casePlanAttachment,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.submitCasePlan(id, casePlanDescription, casePlanAttachment, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error submitting case plan: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error submitting case plan: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/send-case-plan-to-assistant-commissioner")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<?> sendCasePlanToAssistantCommissioner(
            @PathVariable("id") Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.sendCasePlanToAssistantCommissioner(id, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            log.error("Error sending case plan to AC: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/send-case-plan-to-director-investigation")
    @PreAuthorize("hasAuthority('LEGAL_REVIEW')")
    public ResponseEntity<?> sendToDirectorInvestigationFromLegal(
            @PathVariable("id") Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.sendCasePlanToDirectorInvestigation(id, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error sending case plan to Director of Investigation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error sending case plan: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @GetMapping("/director-investigation/case-plans")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<List<ReportResponseDTO>> getCasePlansForDirectorInvestigation(
            Authentication authentication) {
        String directorId = authentication.getName();
        try {
            List<Report> reports = reportService.getCasePlansForDirectorInvestigation(directorId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (RuntimeException e) {
            log.error("Authorization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error getting case plans: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/case-plan")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<ReportResponseDTO> getCasePlan(
            @PathVariable Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.getReport(id);
            List<Employee> directors = reportRepo.DirectorsOfInvestigation();
            boolean hasAccess = directors.stream()
                    .anyMatch(d -> d.getEmployeeId().equals(employeeId));

            if (!hasAccess) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            log.error("Error getting case plan: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/{id}/approve-case-plan")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<?> approveCasePlan(
            @PathVariable("id") Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.approveCasePlan(id, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error approving case plan: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error approving case plan: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/reject-case-plan")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<?> rejectCasePlan(
            @PathVariable Integer id,
            @RequestParam(required = false) String rejectionReason,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.rejectCasePlan(id, rejectionReason, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error rejecting case plan: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error rejecting case plan: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/approve-investigation-report")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<?> approveInvestigationReport(
            @PathVariable Integer id,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.approveInvestigationReport(id, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error approving investigation report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error approving investigation report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/reject-investigation-report")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<?> rejectInvestigationReport(
            @PathVariable Integer id,
            @RequestParam String rejectionReason,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            Report report = reportService.rejectInvestigationReport(id, rejectionReason, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error rejecting investigation report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error rejecting investigation report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/return-investigation-report")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_INVESTIGATION')")
    public ResponseEntity<?> returnInvestigationReport(
            @PathVariable Integer id,
            @RequestBody Map<String, String> requestBody,
            Authentication authentication) {
        String employeeId = authentication.getName();
        try {
            String returnReason = requestBody.get("returnReason");
            if (returnReason == null || returnReason.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            Report report = reportService.returnInvestigationReport(id, returnReason, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error returning investigation report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error returning investigation report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }
    @GetMapping("/assistant-commissioner/case-plans")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_ASSISTANT_COMMISSIONER')")
    public ResponseEntity<PageResponseDTO<ReportResponseDTO>> getCasePlansForAssistantCommissioner(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        try {
            String employeeId = authentication.getName();
            return ResponseEntity.ok(reportService.getCasePlanPageForAssistantCommissioner(
                    employeeId,
                    page,
                    size,
                    search));
        } catch (RuntimeException e) {
            log.error("Authorization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error getting case plans for AC: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{id}/approve-case-plan-assistant-commissioner")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_ASSISTANT_COMMISSIONER')")
    public ResponseEntity<?> approveCasePlanByAssistantCommissioner(
            @PathVariable Integer id,
            Authentication authentication) {
        try {
            String employeeId = authentication.getName();
            Report report = reportService.approveCasePlanByAssistantCommissioner(id, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error approving case plan by AC: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error approving case plan: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/reject-case-plan-assistant-commissioner")
    @PreAuthorize("hasAuthority('REPORT_APPROVE_ASSISTANT_COMMISSIONER')")
    public ResponseEntity<?> rejectCasePlanByAssistantCommissioner(
            @PathVariable Integer id,
            @RequestParam String rejectionReason,
            Authentication authentication) {
        try {
            String employeeId = authentication.getName();
            Report report = reportService.rejectCasePlanByAssistantCommissioner(id, rejectionReason, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (RuntimeException e) {
            log.error("Error rejecting case plan by AC: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error rejecting case plan: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal system error: " + e.getMessage());
        }
    }
}
