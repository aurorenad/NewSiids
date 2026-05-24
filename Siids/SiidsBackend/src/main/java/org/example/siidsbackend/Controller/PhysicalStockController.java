package org.example.siidsbackend.Controller;

import org.example.siidsbackend.DTO.Request.EscalateRequestDTO;
import org.example.siidsbackend.DTO.Request.ReleaseNoteRequestDTO;
import org.example.siidsbackend.DTO.Request.SeizureNoteRequestDTO;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Service.employeeService;
import org.example.siidsbackend.Service.PhysicalStockService;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<?> getTemporaryStock() {
        return ResponseEntity.ok(physicalStockService.getTemporaryStock());
    }

    @GetMapping("/temporary/history")
    public ResponseEntity<?> getSeizureHistory() {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.getSeizureHistory(physicalStockService.getEmployeeByUsername(username)));
    }

    @GetMapping("/temporary/next-reference")
    public ResponseEntity<Map<String, String>> getNextReference() {
        return ResponseEntity.ok(Map.of("nextReference", physicalStockService.generateNextSeizureNumber()));
    }

    @PostMapping("/temporary/seizure-notes")
    public ResponseEntity<?> createSeizureNote(@RequestBody SeizureNoteRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.createSeizureNote(dto, physicalStockService.getEmployeeByUsername(username)));
    }

    @PutMapping("/temporary/seizure-notes/{id}")
    public ResponseEntity<?> updateSeizureNote(@PathVariable Integer id, @RequestBody SeizureNoteRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.updateSeizureNote(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    @GetMapping("/temporary/{id}/seizure-note")
    public ResponseEntity<?> downloadSeizureNote(@PathVariable Integer id) {
        log.info("Download request received for Seizure Note ID: {}", id);
        try {
            byte[] pdf = physicalStockService.generateSeizureNotePdf(id);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"SeizureNote-" + id + ".pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping("/temporary/{id}/release")
    public ResponseEntity<?> releaseFromTempStock(@PathVariable Integer id, @RequestBody ReleaseNoteRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.releaseFromTemporaryStock(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    @PostMapping("/temporary/{id}/escalate")
    public ResponseEntity<?> escalateToMainStock(@PathVariable Integer id, @RequestBody EscalateRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.escalateToMainStock(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    // --- STATE MACHINE ---

    @PatchMapping("/{id}/approve-intake")
    public ResponseEntity<?> approveIntake(@PathVariable Integer id) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.approveIntake(id, physicalStockService.getEmployeeByUsername(username)));
    }

    @PatchMapping("/{id}/return")
    public ResponseEntity<?> returnGoods(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        physicalStockService.returnForCorrection(id, payload.get("reason"), physicalStockService.getEmployeeByUsername(username));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/request-release")
    public ResponseEntity<?> requestRelease(@PathVariable Integer id, @RequestBody ReleaseNoteRequestDTO dto) {
        log.info("Processing Request Release for ID: {}", id);
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.requestRelease(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    @PatchMapping("/{id}/approve-release")
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
    public ResponseEntity<?> rejectReleaseMachine(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        physicalStockService.rejectRelease(id, payload.get("reason"), physicalStockService.getEmployeeByUsername(username));
        return ResponseEntity.ok().build();
    }

    // --- MAIN STOCK VIEW & APPROVALS ---

    @GetMapping("/main")
    public ResponseEntity<?> getMainStock() {
        return ResponseEntity.ok(physicalStockService.getAllGoodsForManager());
    }

    @GetMapping("/pending-approvals")
    public ResponseEntity<?> getPendingApprovals() {
        return ResponseEntity.ok(physicalStockService.getPendingApprovals());
    }

    @GetMapping("/approval-history")
    public ResponseEntity<?> getApprovalHistory() {
        return ResponseEntity.ok(physicalStockService.getApprovalHistory());
    }
@GetMapping("/{id}/pv-pdf")
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
    public ResponseEntity<?> getReleaseNotePdf(@PathVariable Integer id) {
        try {
            byte[] pdf = physicalStockService.generateReleaseNotePdf(id);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ReleaseNote-" + id + ".pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error generating PDF: " + e.getMessage());
        }
    }

    @PostMapping("/release-notes/preview")
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
