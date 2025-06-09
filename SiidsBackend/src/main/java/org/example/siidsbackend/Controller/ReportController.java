package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Response.ReportResponseDTO;
import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Service.ReportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;

    @PostMapping
    public ResponseEntity<ReportResponseDTO> createReport(
            @RequestParam("description") String description,
            @RequestParam(value = "attachment", required = false) MultipartFile attachment,
            @RequestHeader("Employee-Id") String employeeId) {

        try {
            String attachmentPath = null;
            if (attachment != null && !attachment.isEmpty()) {
                attachmentPath = storeAttachment(attachment);
            }

            ReportRequestDTO dto = new ReportRequestDTO();
            dto.setDescription(description);
            dto.setAttachmentPath(attachmentPath);

            Report report = reportService.createReport(dto, employeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String storeAttachment(MultipartFile file) throws Exception {
        String fileName = LocalDateTime.now().toString() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get("C:\\Users\\int000098\\Documents" + fileName);
        Files.createDirectories(filePath.getParent());
        Files.write(filePath, file.getBytes());
        return fileName;
    }

    @GetMapping("/my-reports")
    public ResponseEntity<List<ReportResponseDTO>> getMyReports(
            @RequestHeader("Employee-Id") String employeeId) {
        try {
            List<Report> reports = reportService.getReportsByEmployee(employeeId);
            List<ReportResponseDTO> responseList = reports.stream()
                    .map(reportService::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportResponseDTO> getReport(
            @PathVariable Integer id,
            @RequestHeader("Employee-Id") String employeeId) {
        try {
            Report report = reportService.getReport(id);
            // Add authorization check here if needed
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/{id}/send-to-director")
    public ResponseEntity<ReportResponseDTO> sendToDirector(
            @PathVariable Integer id,
            @RequestParam String directorId,
            @RequestHeader("Employee-Id") String employeeId) {
        try {
            Report report = reportService.sendToDirector(id, directorId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/{id}/send-to-commissioner")
    public ResponseEntity<ReportResponseDTO> sendToCommissioner(
            @PathVariable Integer id,
            @RequestParam String commissionerId,
            @RequestHeader("Employee-Id") String employeeId) {
        try {
            Report report = reportService.sendToAssistantCommissioner(id, commissionerId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/{id}/return")
    public ResponseEntity<ReportResponseDTO> returnReport(
            @PathVariable Integer id,
            @RequestParam String returnToEmployeeId,
            @RequestHeader("Employee-Id") String employeeId) {
        try {
            Report report = reportService.returnReport(id, returnToEmployeeId);
            return ResponseEntity.ok(reportService.toResponseDTO(report));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
}