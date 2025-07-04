package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.CaseRequestDTO;
import org.example.siidsbackend.DTO.Response.CaseResponseDTO;
import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Service.CaseService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cases")
@RequiredArgsConstructor
@Slf4j
public class CaseController {
    private final CaseService caseService;

    @PostMapping
    public ResponseEntity<CaseResponseDTO> createCase(
            @RequestBody CaseRequestDTO caseRequestDTO,
            @RequestHeader("employee_id") String employeeId) {
        try {
            Case createdCase = caseService.createCase(caseRequestDTO, employeeId);
            return ResponseEntity.status(HttpStatus.CREATED).body(toResponseDTO(createdCase));
        } catch (Exception e) {
            log.error("Error creating case", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<CaseResponseDTO>> getMyCases(
            @RequestHeader("employee_id") String employeeId) {
        try {
            List<CaseResponseDTO> response = caseService.getCasesByCreator(employeeId.trim())
                    .stream()
                    .map(this::toResponseDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching cases", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaseResponseDTO> getCaseById(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId) {
        try {
            return caseService.getCaseIfCreator(id, employeeId)
                    .map(this::toResponseDTO)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error fetching case", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CaseResponseDTO> updateCaseStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> statusUpdate,
            @RequestHeader("employee_id") String employeeId) {
        try {
            String newStatus = statusUpdate.get("status");
            if (newStatus == null || newStatus.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            WorkflowStatus workflowStatus;
            try {
                workflowStatus = WorkflowStatus.valueOf(newStatus);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }

            Case updatedCase = caseService.updateCaseStatus(id, employeeId, workflowStatus);
            if (updatedCase == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(toResponseDTO(updatedCase));
        } catch (Exception e) {
            log.error("Error updating case status", e);
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
        dto.setStatus(c.getStatus().name());
        dto.setCreatedByName(c.getCreatedBy().getGivenName() + " " + c.getCreatedBy().getFamilyName());
        dto.setSummaryOfInformationCase(c.getSummaryOfInformationCase());
        dto.setInformerId(c.getInformerId());
        dto.setInformerName(c.getInformerName());
        return dto;
    }
}