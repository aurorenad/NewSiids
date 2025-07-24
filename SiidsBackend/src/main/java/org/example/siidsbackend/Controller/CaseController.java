package org.example.siidsbackend.Controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.InformerDTO;
import org.example.siidsbackend.DTO.Request.CaseRequestDTO;
import org.example.siidsbackend.DTO.Response.CaseResponseDTO;
import org.example.siidsbackend.DTO.TaxPayerDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Service.CaseService;
import org.example.siidsbackend.Service.InformerService;
import org.example.siidsbackend.Service.TaxPayerService;
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
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.3000", "http://localhost:3000"})
public class CaseController {
    private final CaseService caseService;
    private final TaxPayerService taxPayerService;
    private final InformerService informerService;

    @PostMapping
    public ResponseEntity<CaseResponseDTO> createCase(
            @RequestBody CaseRequestDTO caseRequestDTO,
            @RequestHeader("employee_id") String employeeId) {
        try {
            TaxPayer taxPayer = taxPayerService.findByTIN(caseRequestDTO.getTin())
                    .orElseGet(() -> {
                        TaxPayer newTaxPayer = new TaxPayer();
                        newTaxPayer.setTaxPayerTIN(caseRequestDTO.getTin());
                        newTaxPayer.setTaxPayerName(caseRequestDTO.getTaxPayerName());
                        newTaxPayer.setTaxPayerAddress(caseRequestDTO.getTaxPayerAddress());
                        return taxPayerService.addTaxPayer(newTaxPayer);
                    });
            Informer informer = null;
            if (caseRequestDTO.getInformerNationalId() != null) {
                informer = informerService.findByNationalId(caseRequestDTO.getInformerNationalId())
                        .orElseGet(() -> {
                            Informer newInformer = new Informer();
                            newInformer.setNationalId(caseRequestDTO.getInformerNationalId());
                            newInformer.setInformerName(caseRequestDTO.getInformerName());
                            newInformer.setInformerPhoneNum(caseRequestDTO.getInformerPhoneNum());
                            newInformer.setInformerAddress(caseRequestDTO.getInformerAddress());
                            newInformer.setInformerEmail(caseRequestDTO.getInformerEmail());
                            newInformer.setInformerId(newInformer.generateInformerNumber());
                            return informerService.addInformer(newInformer);
                        });
            }

            Case createdCase = caseService.createCase(caseRequestDTO, employeeId, taxPayer, informer);
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

    @GetMapping("/caseNum/**")
    public ResponseEntity<CaseResponseDTO> getCaseByCaseNum(
            @RequestHeader("employee_id") String employeeId,
            HttpServletRequest request) {
        try {
            String requestURI = request.getRequestURI();
            String caseNumPath = "/api/cases/caseNum/";

            if (!requestURI.contains(caseNumPath)) {
                log.error("Invalid request URI: {}", requestURI);
                return ResponseEntity.badRequest().build();
            }

            // Extract everything after "/api/cases/caseNum/"
            String caseNum = requestURI.substring(requestURI.indexOf(caseNumPath) + caseNumPath.length());

            log.info("Searching for case with number: {}", caseNum);

            return caseService.getCaseByCaseNum(caseNum, employeeId)
                    .map(this::toResponseDTO)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error fetching case by number", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private CaseResponseDTO toResponseDTO(Case c) {
        CaseResponseDTO dto = new CaseResponseDTO();

        dto.setId(c.getId());
        dto.setCaseNum(c.getCaseNum());
        dto.setTaxPeriod(c.getTaxPeriod());
        dto.setStatus(c.getStatus().name());
        dto.setCreatedByName(c.getCreatedBy().getGivenName() + " " + c.getCreatedBy().getFamilyName());
        dto.setSummaryOfInformationCase(c.getSummaryOfInformationCase());
        dto.setCreatedAt(c.getReportedDate());
        dto.setUpdatedAt(c.getUpdatedAt());

        if (c.getTin() != null) {
            TaxPayerDTO taxPayerDTO = new TaxPayerDTO();
            taxPayerDTO.setTin(c.getTin().getTaxPayerTIN());
            taxPayerDTO.setName(c.getTin().getTaxPayerName());
            taxPayerDTO.setAddress(c.getTin().getTaxPayerAddress());
            taxPayerDTO.setContact(c.getTin().getTaxPayerContact());
            dto.setTaxPayer(taxPayerDTO);
        }

        if (c.getInformerId() != null) {
            InformerDTO informerDTO = new InformerDTO();

            informerDTO.setNationalId(c.getInformerId().getNationalId());
            informerDTO.setInformerId(c.getInformerId().getInformerId());
            informerDTO.setName(c.getInformerId().getInformerName());
            informerDTO.setGender(c.getInformerId().getInformerGender());
            informerDTO.setPhoneNum(c.getInformerId().getInformerPhoneNum());
            informerDTO.setAddress(c.getInformerId().getInformerAddress());
            informerDTO.setEmail(c.getInformerId().getInformerEmail());
            dto.setInformer(informerDTO);
        }

        return dto;
    }
}