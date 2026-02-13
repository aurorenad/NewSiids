package org.example.siidsbackend.Controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.CaseRequestDTO;
import org.example.siidsbackend.DTO.Request.InformerRegistrationDTO;
import org.example.siidsbackend.DTO.Response.CaseResponseDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Service.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/cases")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.3000", "http://localhost:3000"})
public class CaseController {
    private final CaseService caseService;
    private final TaxPayerService taxPayerService;
    private final InformerService informerService;
    private final ReportService reportService;

    @PostMapping
    public ResponseEntity<CaseResponseDTO> createCase(
            @RequestBody CaseRequestDTO caseRequestDTO,
            @RequestHeader("employee_id") String employeeId) {
        try {
            log.info("Creating case for employee: {}, with TIN: {}", employeeId, caseRequestDTO.getTin());

            if (caseRequestDTO.getTin() == null || caseRequestDTO.getTin().trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            TaxPayer taxPayer = taxPayerService.findByTIN(caseRequestDTO.getTin().trim())
                    .orElseGet(() -> {
                        TaxPayer newTaxPayer = new TaxPayer();
                        newTaxPayer.setTaxPayerTIN(caseRequestDTO.getTin().trim());
                        newTaxPayer.setTaxPayerName(caseRequestDTO.getTaxPayerName());
                        newTaxPayer.setTaxPayerAddress(caseRequestDTO.getTaxPayerAddress());
                        return taxPayerService.addTaxPayer(newTaxPayer);
                    });

            // Handle informer information (if not anonymous)
            Informer informer = null;
            String informerNationalId = caseRequestDTO.getInformerNationalId();
            String informerType = caseRequestDTO.getInformerType();

            log.info("Informer type: {}, National ID: {}", informerType, informerNationalId);

            if (informerNationalId != null && !informerNationalId.trim().isEmpty() &&
                    !"anonymous".equalsIgnoreCase(informerType)) {

                Optional<Informer> existingInformer = informerService.findByNationalId(informerNationalId.trim());

                if (existingInformer.isPresent()) {
                    informer = existingInformer.get();
                    log.info("Found existing informer with ID: {}", informer.getInformerId());
                } else {
                    // Create new informer
                    Informer newInformer = new Informer();
                    newInformer.setNationalId(informerNationalId.trim());
                    newInformer.setInformerName(caseRequestDTO.getInformerName());
                    newInformer.setInformerPhoneNum(caseRequestDTO.getInformerPhoneNum());
                    newInformer.setInformerAddress(caseRequestDTO.getInformerAddress());
                    newInformer.setInformerEmail(caseRequestDTO.getInformerEmail());

                    if (caseRequestDTO.getInformerGender() != null) {
                        newInformer.setInformerGender(caseRequestDTO.getInformerGender());
                    }
                    String informerId = newInformer.getInformerId();
                    newInformer.setInformerId(informerId);

                    informer = informerService.addInformer(newInformer);
                    log.info("Created new informer with ID: {}", informerId);
                }
            } else {
                log.info("No informer or anonymous informer for this case");
            }

            // Create the case with all collected information
            Case createdCase = caseService.createCase(caseRequestDTO, employeeId, taxPayer, informer);

            if (createdCase == null) {
                log.error("Failed to create case");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }

            log.info("Case created successfully with ID: {}", createdCase.getId());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(caseService.getCaseResponseById(createdCase.getId()));
        } catch (IllegalArgumentException e) {
            log.error("Invalid argument when creating case", e);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error creating case", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<CaseResponseDTO>> getMyCases(
            @RequestHeader("employee_id") String employeeId) {
        try {
            List<CaseResponseDTO> response = caseService.getCasesByCreator(employeeId.trim());
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
            Optional<CaseResponseDTO> caseResponse = caseService.getCaseIfCreator(id, employeeId);
            return caseResponse
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

            CaseResponseDTO updatedCase = caseService.updateCaseStatus(id, employeeId, workflowStatus);
            if (updatedCase == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(updatedCase);
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

            String caseNum = requestURI.substring(requestURI.indexOf(caseNumPath) + caseNumPath.length());
            log.info("Searching for case with number: {}", caseNum);

            Optional<CaseResponseDTO> caseResponse = caseService.getCaseByCaseNum(caseNum, employeeId);
            return caseResponse
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error fetching case by number", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{caseId}/reports")
    public ResponseEntity<List<Report>> getCaseReports(
            @PathVariable Integer caseId,
            @RequestHeader("employee_id") String employeeId) {
        try {
            // Verify the requester has access to the case
            Optional<CaseResponseDTO> caseResponse = caseService.getCaseIfCreator(caseId, employeeId);
            if (caseResponse.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<Report> reports = reportService.getReportsByCaseNum(caseResponse.get().getCaseNum());
            return ResponseEntity.ok(reports);
        } catch (Exception e) {
            log.error("Error fetching case reports", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<CaseResponseDTO>> getCasesByStatus(
            @PathVariable String status,
            @RequestHeader("employee_id") String employeeId) {
        try {
            WorkflowStatus workflowStatus = WorkflowStatus.valueOf(status.toUpperCase());
            List<CaseResponseDTO> response = caseService.getCasesByStatus(workflowStatus, employeeId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error fetching cases by status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCase(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId) {
        try {
            caseService.deleteCase(id, employeeId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.error("Error deleting case", e);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error deleting case", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/informers/register")
    public ResponseEntity<Informer> registerInformer(
            @RequestBody InformerRegistrationDTO registrationDTO,
            @RequestHeader("employee_id") String employeeId) {
        try {
            // Check if informer already exists
            Optional<Informer> existingInformer = informerService.findByNationalId(registrationDTO.getNationalId());

            if (existingInformer.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(existingInformer.get());
            }

            // Create new informer
            Informer newInformer = new Informer();
            newInformer.setNationalId(registrationDTO.getNationalId());
            newInformer.setInformerName(registrationDTO.getInformerName());
            newInformer.setInformerGender(registrationDTO.getInformerGender());
            newInformer.setInformerPhoneNum(registrationDTO.getInformerPhoneNum());
            newInformer.setInformerAddress(registrationDTO.getInformerAddress());
            newInformer.setInformerEmail(registrationDTO.getInformerEmail());
            newInformer.setInformerId(newInformer.generateInformerNumber());

            Informer savedInformer = informerService.addInformer(newInformer);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedInformer);

        } catch (Exception e) {
            log.error("Error registering informer", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}