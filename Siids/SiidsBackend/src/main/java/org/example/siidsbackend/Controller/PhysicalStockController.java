package org.example.siidsbackend.Controller;

import org.example.siidsbackend.DTO.Request.EscalateRequestDTO;
import org.example.siidsbackend.DTO.Request.ReleaseNoteRequestDTO;
import org.example.siidsbackend.DTO.Request.SeizureNoteRequestDTO;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Service.employeeService;
import org.example.siidsbackend.Service.PhysicalStockService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/stock/goods")
@lombok.extern.slf4j.Slf4j
public class PhysicalStockController {

    private final PhysicalStockService physicalStockService;
    private final employeeService employeeServiceObj;

    public PhysicalStockController(PhysicalStockService physicalStockService, employeeService employeeServiceObj) {
        this.physicalStockService = physicalStockService;
        this.employeeServiceObj = employeeServiceObj;
    }

    // --- TEMPORARY STOCK ---

    @GetMapping("/temporary")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<?> getTemporaryStock() {
        return ResponseEntity.ok(physicalStockService.getTemporaryStock());
    }

    @GetMapping("/temporary/history")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<?> getSeizureHistory() {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.getSeizureHistory(username));
    }

    @GetMapping("/temporary/next-reference")
    @PreAuthorize("hasAuthority('SURVEILLANCE_CREATE')")
    public ResponseEntity<Map<String, String>> getNextReference() {
        return ResponseEntity.ok(Map.of("nextReference", physicalStockService.generateNextSeizureNumber()));
    }

    @PostMapping("/temporary/seizure-notes")
    @PreAuthorize("hasAuthority('SURVEILLANCE_CREATE')")
    public ResponseEntity<?> createSeizureNote(@RequestBody SeizureNoteRequestDTO dto) {
        try {
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(physicalStockService.createSeizureNote(dto, physicalStockService.getEmployeeByUsername(username)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/temporary/seizure-notes/{id}")
    @PreAuthorize("hasAuthority('SURVEILLANCE_CREATE')")
    public ResponseEntity<?> updateSeizureNote(@PathVariable Integer id, @RequestBody SeizureNoteRequestDTO dto) {
        try {
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(physicalStockService.updateSeizureNote(id, dto, physicalStockService.getEmployeeByUsername(username)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/temporary/{id}/seizure-note")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<?> downloadSeizureNote(@PathVariable Integer id) {
        log.info("Download request received for Seizure Note ID: {}", id);
        try {
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            byte[] pdf = physicalStockService.generateSeizureNotePdf(id, username);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"SeizureNote-" + id + ".pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping("/temporary/{id}/release")
    @PreAuthorize("hasAuthority('TEMP_STOCK_MANAGE')")
    public ResponseEntity<?> releaseFromTempStock(@PathVariable Integer id, @RequestBody ReleaseNoteRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.releaseFromTemporaryStock(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    @PostMapping("/temporary/{id}/escalate")
    @PreAuthorize("hasAuthority('TEMP_STOCK_MANAGE')")
    public ResponseEntity<?> escalateToMainStock(@PathVariable Integer id, @RequestBody EscalateRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.escalateToMainStock(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    // --- STATE MACHINE ---

    @PatchMapping("/{id}/approve-intake")
    @PreAuthorize("hasAuthority('STOCK_MANAGE')")
    public ResponseEntity<?> approveIntake(@PathVariable Integer id) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.approveIntake(id, physicalStockService.getEmployeeByUsername(username)));
    }

    @PatchMapping("/{id}/return")
    @PreAuthorize("hasAuthority('STOCK_MANAGE')")
    public ResponseEntity<?> returnGoods(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        physicalStockService.returnForCorrection(id, payload.get("reason"), physicalStockService.getEmployeeByUsername(username));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/request-release")
    @PreAuthorize("hasAuthority('STOCK_MANAGE')")
    public ResponseEntity<?> requestRelease(@PathVariable Integer id, @RequestBody ReleaseNoteRequestDTO dto) {
        log.info("Processing Request Release for ID: {}", id);
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.requestRelease(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    @PatchMapping("/{id}/approve-release")
    @PreAuthorize("hasAuthority('STOCK_APPROVE_RELEASE')")
    public ResponseEntity<?> approveReleaseMachine(@PathVariable Integer id) {
        log.info("PRSO Request to AUTHORIZE RELEASE for Seizure Note ID: {}", id);
        try {
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            Employee prso = physicalStockService.getEmployeeByUsername(username);
            physicalStockService.approveRelease(id, prso);
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(java.util.Map.of("error", "Invalid State Transition", "message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/reject-release")
    @PreAuthorize("hasAuthority('STOCK_APPROVE_RELEASE')")
    public ResponseEntity<?> rejectReleaseMachine(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        physicalStockService.rejectRelease(id, payload.get("reason"), physicalStockService.getEmployeeByUsername(username));
        return ResponseEntity.ok().build();
    }

    // --- MAIN STOCK VIEW & APPROVALS ---

    @GetMapping("/main")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<?> getMainStock() {
        return ResponseEntity.ok(physicalStockService.getAllGoodsForManager());
    }

    @GetMapping("/pending-approvals")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<?> getPendingApprovals() {
        return ResponseEntity.ok(physicalStockService.getPendingApprovals());
    }

    @GetMapping("/approval-history")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<?> getApprovalHistory() {
        return ResponseEntity.ok(physicalStockService.getApprovalHistory());
    }
@GetMapping("/{id}/pv-pdf")
@PreAuthorize("hasAuthority('STOCK_VIEW')")
public ResponseEntity<?> downloadPVPdf(@PathVariable Integer id) {
    log.info("Download request received for PV/Goods ID: {}", id);
    try {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        byte[] pdf = physicalStockService.generatePVDocumentPdf(id, username);

        // Try to determine a filename
        String filename = "PV-Document-" + id + ".pdf";

        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    } catch (Exception e) {
        log.error("Error generating PV PDF for ID {}: {}", id, e.getMessage());
        return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error generating PV Document: " + e.getMessage());
    }
}

    @GetMapping("/release-notes/{id}/pdf")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<?> getReleaseNotePdf(@PathVariable Integer id) {
        try {
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            byte[] pdf = physicalStockService.generateReleaseNotePdf(id, username);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ReleaseNote-" + id + ".pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error generating PDF: " + e.getMessage());
        }
    }

    @PostMapping("/release-notes/preview")
    @PreAuthorize("hasAuthority('TEMP_STOCK_MANAGE')")
    public ResponseEntity<?> previewReleaseNote(@RequestBody java.util.Map<String, String> payload) {
        try {
            byte[] pdf = physicalStockService.generateReleaseNotePreview(payload);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Draft-ReleaseNote.pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error generating PDF preview: " + e.getMessage());
        }
    }
}
