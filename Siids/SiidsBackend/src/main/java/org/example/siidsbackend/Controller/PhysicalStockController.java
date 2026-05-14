package org.example.siidsbackend.Controller;

import org.example.siidsbackend.DTO.Request.EditRequestDTO;
import org.example.siidsbackend.DTO.Request.EscalateRequestDTO;
import org.example.siidsbackend.DTO.Request.ReleaseNoteRequestDTO;
import org.example.siidsbackend.DTO.Request.SeizureNoteRequestDTO;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.UserPrincipal;
import org.example.siidsbackend.Service.employeeService;
import org.example.siidsbackend.Service.PhysicalStockService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/stock")
public class PhysicalStockController {

    private final PhysicalStockService physicalStockService;
    private final employeeService employeeServiceObj;

    public PhysicalStockController(PhysicalStockService physicalStockService, employeeService employeeServiceObj) {
        this.physicalStockService = physicalStockService;
        this.employeeServiceObj = employeeServiceObj;
    }

    private Employee getCurrentEmployee(String employeeId) {
        return employeeServiceObj.findById(employeeId)
                .orElseThrow(() -> new IllegalStateException("Employee not found with ID: " + employeeId));
    }

    // --- TEMPORARY STOCK (PV In Charge) ---

    @GetMapping("/temporary")
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance') or hasAuthority('SURVEILLANCE') or hasAuthority('ROLE_SURVEILLANCE_OFFICER')")
    public ResponseEntity<?> getTemporaryStock() {
        return ResponseEntity.ok(physicalStockService.getTemporaryStock());
    }

    @GetMapping("/temporary/history")
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance') or hasAuthority('SURVEILLANCE') or hasAuthority('ROLE_SURVEILLANCE_OFFICER')")
    public ResponseEntity<?> getSeizureHistory() {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.getSeizureHistory(physicalStockService.getEmployeeByUsername(username)));
    }

    @PostMapping("/temporary/seizure-notes")
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance') or hasAuthority('SURVEILLANCE') or hasAuthority('ROLE_SURVEILLANCE_OFFICER')")
    public ResponseEntity<?> createSeizureNote(@RequestBody SeizureNoteRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.createSeizureNote(dto, physicalStockService.getEmployeeByUsername(username)));
    }

    @GetMapping("/temporary/{id}/seizure-note")
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance') or hasAuthority('SURVEILLANCE') or hasAuthority('ROLE_SURVEILLANCE_OFFICER')")
    public ResponseEntity<?> downloadSeizureNote(@PathVariable Integer id) {
        try {
            byte[] pdf = physicalStockService.generateSeizureNotePdf(id);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"SeizureNote-" + id + ".pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error generating PDF: " + e.getMessage());
        }
    }

    @PostMapping("/temporary/{id}/release")
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance') or hasAuthority('SURVEILLANCE') or hasAuthority('ROLE_SURVEILLANCE_OFFICER')")
    public ResponseEntity<?> releaseFromTempStock(@PathVariable Integer id, @RequestBody ReleaseNoteRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.releaseFromTemporaryStock(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    @PostMapping("/temporary/{id}/escalate")
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance') or hasAuthority('SURVEILLANCE') or hasAuthority('ROLE_SURVEILLANCE_OFFICER')")
    public ResponseEntity<?> escalateToMainStock(@PathVariable Integer id, @RequestBody EscalateRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.escalateToMainStock(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    // --- MAIN STOCK (Stock Manager) ---

    @GetMapping("/main")
    @PreAuthorize("hasAuthority('STOCK_MANAGER') or hasAuthority('StockManager') or hasAuthority('STOCKMANAGER')")
    public ResponseEntity<?> getMainStock() {
        return ResponseEntity.ok(physicalStockService.getMainStock());
    }

    @GetMapping("/main/{id}/pv-pdf")
    public ResponseEntity<?> downloadPVPdf(@PathVariable Integer id) {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String username = auth.getName();
            byte[] pdf = physicalStockService.generatePVDocumentPdf(id, username);
            
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"PV-Document-" + id + ".pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error generating PV Document: " + e.getMessage());
        }
    }

    @GetMapping("/main/pending-approvals")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> getPendingApprovals() {
        return ResponseEntity.ok(physicalStockService.getPendingApprovals());
    }

    @PostMapping("/main/{id}/release-notes")
    @PreAuthorize("hasAuthority('STOCK_MANAGER') or hasAuthority('StockManager') or hasAuthority('STOCKMANAGER')")
    public ResponseEntity<?> requestMainStockRelease(@PathVariable Integer id, @RequestBody ReleaseNoteRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.requestMainStockRelease(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    @PostMapping("/main/{id}/request-edit")
    @PreAuthorize("hasAuthority('STOCK_MANAGER') or hasAuthority('StockManager') or hasAuthority('STOCKMANAGER')")
    public ResponseEntity<?> requestMainStockEdit(@PathVariable Integer id, @RequestBody EditRequestDTO dto) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.requestMainStockEdit(id, dto, physicalStockService.getEmployeeByUsername(username)));
    }

    // --- PRSO APPROVALS ---

    // For PRSO to list pending, they would call a filtered /main or a dedicated endpoint. 
    // Kept simple here. The service methods handle the logic.

    @PostMapping("/main/release-notes/{id}/approve")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> approveRelease(@PathVariable Integer id) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.approveMainStockRelease(id, physicalStockService.getEmployeeByUsername(username)));
    }

    @PostMapping("/main/release-notes/{id}/reject")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> rejectRelease(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        physicalStockService.rejectMainStockRelease(id, payload.get("reason"), physicalStockService.getEmployeeByUsername(username));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/main/edit-requests/{id}/approve")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> approveEdit(@PathVariable Integer id) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(physicalStockService.approveMainStockEdit(id, physicalStockService.getEmployeeByUsername(username)));
    }

    @PostMapping("/main/edit-requests/{id}/reject")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> rejectEdit(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        physicalStockService.rejectMainStockEdit(id, payload.get("reason"), physicalStockService.getEmployeeByUsername(username));
        return ResponseEntity.ok().build();
    }
}
