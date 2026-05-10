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
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance')")
    public ResponseEntity<?> getTemporaryStock() {
        return ResponseEntity.ok(physicalStockService.getTemporaryStock());
    }

    @PostMapping("/temporary/seizure-notes")
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance')")
    public ResponseEntity<?> createSeizureNote(@RequestBody SeizureNoteRequestDTO dto, @RequestHeader("employee_id") String employeeId) {
        return ResponseEntity.ok(physicalStockService.createSeizureNote(dto, getCurrentEmployee(employeeId)));
    }

    @PostMapping("/temporary/{id}/release")
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance')")
    public ResponseEntity<?> releaseFromTempStock(@PathVariable Integer id, @RequestBody ReleaseNoteRequestDTO dto, @RequestHeader("employee_id") String employeeId) {
        return ResponseEntity.ok(physicalStockService.releaseFromTemporaryStock(id, dto, getCurrentEmployee(employeeId)));
    }

    @PostMapping("/temporary/{id}/escalate")
    @PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER') or hasAuthority('Surveillance')")
    public ResponseEntity<?> escalateToMainStock(@PathVariable Integer id, @RequestBody EscalateRequestDTO dto, @RequestHeader("employee_id") String employeeId) {
        return ResponseEntity.ok(physicalStockService.escalateToMainStock(id, dto, getCurrentEmployee(employeeId)));
    }

    // --- MAIN STOCK (Stock Manager) ---

    @GetMapping("/main")
    @PreAuthorize("hasAuthority('STOCK_MANAGER') or hasAuthority('StockManager')")
    public ResponseEntity<?> getMainStock() {
        return ResponseEntity.ok(physicalStockService.getMainStock());
    }

    @GetMapping("/main/pending-approvals")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> getPendingApprovals() {
        return ResponseEntity.ok(physicalStockService.getPendingApprovals());
    }

    @PostMapping("/main/{id}/release-notes")
    @PreAuthorize("hasAuthority('STOCK_MANAGER') or hasAuthority('StockManager')")
    public ResponseEntity<?> requestMainStockRelease(@PathVariable Integer id, @RequestBody ReleaseNoteRequestDTO dto, @RequestHeader("employee_id") String employeeId) {
        return ResponseEntity.ok(physicalStockService.requestMainStockRelease(id, dto, getCurrentEmployee(employeeId)));
    }

    @PostMapping("/main/{id}/request-edit")
    @PreAuthorize("hasAuthority('STOCK_MANAGER') or hasAuthority('StockManager')")
    public ResponseEntity<?> requestMainStockEdit(@PathVariable Integer id, @RequestBody EditRequestDTO dto, @RequestHeader("employee_id") String employeeId) {
        return ResponseEntity.ok(physicalStockService.requestMainStockEdit(id, dto, getCurrentEmployee(employeeId)));
    }

    // --- PRSO APPROVALS ---

    // For PRSO to list pending, they would call a filtered /main or a dedicated endpoint. 
    // Kept simple here. The service methods handle the logic.

    @PostMapping("/main/release-notes/{id}/approve")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> approveRelease(@PathVariable Integer id, @RequestHeader("employee_id") String employeeId) {
        return ResponseEntity.ok(physicalStockService.approveMainStockRelease(id, getCurrentEmployee(employeeId)));
    }

    @PostMapping("/main/release-notes/{id}/reject")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> rejectRelease(@PathVariable Integer id, @RequestBody Map<String, String> payload, @RequestHeader("employee_id") String employeeId) {
        physicalStockService.rejectMainStockRelease(id, payload.get("reason"), getCurrentEmployee(employeeId));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/main/edit-requests/{id}/approve")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> approveEdit(@PathVariable Integer id, @RequestHeader("employee_id") String employeeId) {
        return ResponseEntity.ok(physicalStockService.approveMainStockEdit(id, getCurrentEmployee(employeeId)));
    }

    @PostMapping("/main/edit-requests/{id}/reject")
    @PreAuthorize("hasAuthority('PRSO')")
    public ResponseEntity<?> rejectEdit(@PathVariable Integer id, @RequestBody Map<String, String> payload, @RequestHeader("employee_id") String employeeId) {
        physicalStockService.rejectMainStockEdit(id, payload.get("reason"), getCurrentEmployee(employeeId));
        return ResponseEntity.ok().build();
    }
}
