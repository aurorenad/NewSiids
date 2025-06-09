package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.CaseRequestDTO;
import org.example.siidsbackend.DTO.Response.CaseResponseDTO;
import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Service.CaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;


@RestController
@RequestMapping("/api/cases")
@RequiredArgsConstructor
@Slf4j
public class CaseController {

    private final CaseService caseService;

    @PostMapping
    public ResponseEntity<CaseResponseDTO> createCase(
            @RequestBody CaseRequestDTO caseRequestDTO,
            @RequestHeader("employee_id") String employeeId
    ) {
        try {
            log.info("Creating case for employee: {}", employeeId);
            Case createdCase = caseService.createCase(caseRequestDTO, employeeId);
            CaseResponseDTO responseDTO = toResponseDTO(createdCase);
            return ResponseEntity.status(HttpStatus.CREATED).body(responseDTO);
        } catch (Exception e) {
            log.error("Error creating case", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<CaseResponseDTO>> getMyCases(
            @RequestHeader(value = "employee_id", required = true) String employeeId
    ) {
        try {
            String cleanEmployeeId = employeeId.trim();
            log.info("Fetching cases for employee: {}", cleanEmployeeId);

            List<Case> cases = caseService.getCasesByCreator(cleanEmployeeId);
            log.info("Found {} cases for employee {}", cases.size(), cleanEmployeeId);

            List<CaseResponseDTO> response = cases.stream()
                    .map(this::toResponseDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Runtime error processing request for employee: {}", employeeId, e);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Unexpected error processing request for employee: {}", employeeId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaseResponseDTO> getCaseById(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId
    ) {
        try {
            log.info("Fetching case {} for employee: {}", id, employeeId);
            return caseService.getCaseIfCreator(id, employeeId)
                    .map(this::toResponseDTO)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (Exception e) {
            log.error("Error fetching case {} for employee {}", id, employeeId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CaseResponseDTO> updateCaseStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> statusUpdate,
            @RequestHeader("employee_id") String employeeId
    ) {
        try {
            String newStatus = statusUpdate.get("status");
            log.info("Updating case {} status to {} for employee: {}", id, newStatus, employeeId);

            if (newStatus == null || newStatus.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            WorkflowStatus workflowStatus;
            try {
                workflowStatus = WorkflowStatus.valueOf(newStatus);
            } catch (IllegalArgumentException e) {
                log.error("Invalid status: {}", newStatus);
                return ResponseEntity.badRequest().build();
            }

            Case updatedCase = caseService.updateCaseStatus(id, employeeId, workflowStatus);
            if (updatedCase == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            CaseResponseDTO responseDTO = toResponseDTO(updatedCase);
            return ResponseEntity.ok(responseDTO);
        } catch (Exception e) {
            log.error("Error updating case status for case {} and employee {}", id, employeeId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private CaseResponseDTO toResponseDTO(Case c) {
        CaseResponseDTO dto = new CaseResponseDTO();
        dto.setCaseNum(c.getCaseNum());
        dto.setTin(c.getTin());
        dto.setTaxPeriod(c.getTaxPeriod());
        dto.setTaxPayerType(c.getTaxPayerType());
        dto.setTaxPayerName(c.getTaxPayerName());
        dto.setStatus(c.getStatus().name()); // Convert enum to string
        dto.setCreatedByName(c.getCreatedBy().getGivenName() + " " + c.getCreatedBy().getFamilyName());
        return dto;
    }
}