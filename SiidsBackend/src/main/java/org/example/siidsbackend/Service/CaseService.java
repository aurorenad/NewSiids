package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.CaseRequestDTO;
import org.example.siidsbackend.DTO.Response.CaseResponseDTO;
import org.example.siidsbackend.DTO.InformerDTO;
import org.example.siidsbackend.DTO.TaxPayerDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.InformerRepository;
import org.example.siidsbackend.Repository.TaxPayerRepository;
import org.example.siidsbackend.Repository.ReportRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CaseService {
    private final CaseRepo caseRepo;
    private final EmployeeRepo employeeRepo;
    private final ReportRepo reportRepo;
    private final AuditService auditService;

    @Transactional
    public Case createCase(CaseRequestDTO dto, String employeeId, TaxPayer taxPayer, Informer informer, Employee referringOfficer) {
        log.info("Creating case for employee: {}", employeeId);

        if (dto == null || employeeId == null) {
            throw new IllegalArgumentException("CaseRequestDTO and employeeId cannot be null");
        }

        Employee creator = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + employeeId));

        Case newCase = new Case();
        newCase.setInformerId(informer);
        newCase.setTin(taxPayer);
        newCase.setSummaryOfInformationCase(dto.getSummaryOfInformationCase());
        newCase.setStatus(WorkflowStatus.CASE_CREATED);
        newCase.setTaxType(dto.getTaxType());
        newCase.setTaxPeriod(dto.getTaxPeriod());
        newCase.setCreatedBy(creator);
        newCase.setReportedDate(LocalDateTime.now());
        newCase.setUpdatedAt(LocalDateTime.now());

        if (referringOfficer != null) {
            newCase.setReferringOfficer(referringOfficer);
        }

        Case savedCase = caseRepo.save(newCase);
        savedCase.setCaseNum(savedCase.generateCaseNumber());
        Case finalCase = caseRepo.save(savedCase);

        auditService.logAction(
                WorkflowStatus.CASE_CREATED,
                "Case " + finalCase.getCaseNum() + " created by " + creator.getEmployeeId(),
                creator
        );

        return finalCase;
    }

    public CaseResponseDTO getCaseResponseById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Case ID cannot be null");
        }

        Case caseEntity = caseRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Case not found with ID: " + id));

        return mapToCaseResponseDTO(caseEntity);
    }

    public List<CaseResponseDTO> getCasesByCreator(String employeeId) {
        if (employeeId == null) {
            throw new IllegalArgumentException("Employee ID cannot be null");
        }

        return caseRepo.findByCreatedBy_EmployeeId(employeeId).stream()
                .map(this::mapToCaseResponseDTO)
                .collect(Collectors.toList());
    }

    public Optional<CaseResponseDTO> getCaseIfCreator(Integer caseId, String employeeId) {
        if (caseId == null || employeeId == null) {
            throw new IllegalArgumentException("Case ID and Employee ID cannot be null");
        }

        return caseRepo.findById(caseId)
                .filter(caseObj -> caseObj.getCreatedBy() != null &&
                        caseObj.getCreatedBy().getEmployeeId().equals(employeeId))
                .map(this::mapToCaseResponseDTO);
    }

    @Transactional
    public CaseResponseDTO updateCaseStatus(Integer id, String employeeId, WorkflowStatus newStatus) {
        if (id == null || employeeId == null || newStatus == null) {
            throw new IllegalArgumentException("ID, employeeId and newStatus cannot be null");
        }

        Case existingCase = caseRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Case not found with ID: " + id));

        if (existingCase.getCreatedBy() == null ||
                !existingCase.getCreatedBy().getEmployeeId().equals(employeeId)) {
            throw new RuntimeException("Only case creator can update status");
        }

        existingCase.setStatus(newStatus);
        existingCase.setUpdatedAt(LocalDateTime.now());

        Case updatedCase = caseRepo.save(existingCase);

        auditService.logAction(
                newStatus,
                "Case " + updatedCase.getCaseNum() + " status changed to " + newStatus + " by " + employeeId,
                existingCase.getCreatedBy()
        );

        return mapToCaseResponseDTO(updatedCase);
    }

    public Optional<CaseResponseDTO> getCaseByCaseNum(String caseNum, String employeeId) {
        if (caseNum == null || employeeId == null) {
            throw new IllegalArgumentException("Case number and employee ID cannot be null");
        }

        return caseRepo.findByCaseNum(caseNum)
                .filter(caseObj -> caseObj.getCreatedBy() != null &&
                        caseObj.getCreatedBy().getEmployeeId().equals(employeeId))
                .map(this::mapToCaseResponseDTO);
    }

    public List<CaseResponseDTO> getCasesByStatus(WorkflowStatus status, String employeeId) {
        if (status == null || employeeId == null) {
            throw new IllegalArgumentException("Status and employee ID cannot be null");
        }

        return caseRepo.findByStatusAndCreatedBy_EmployeeId(status, employeeId.trim()).stream()
                .map(this::mapToCaseResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public CaseResponseDTO updateCaseWithReport(Integer caseId, Integer reportId) {
        if (caseId == null || reportId == null) {
            throw new IllegalArgumentException("Case ID and Report ID cannot be null");
        }

        Case caseEntity = caseRepo.findById(caseId)
                .orElseThrow(() -> new RuntimeException("Case not found with ID: " + caseId));

        Report report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        if (report.getRelatedCase() == null ||
                !report.getRelatedCase().getId().equals(caseId)) {
            throw new RuntimeException("Report does not belong to this case");
        }

        caseEntity.setStatus(WorkflowStatus.REPORT_SUBMITTED);
        caseEntity.setUpdatedAt(LocalDateTime.now());

        Case updatedCase = caseRepo.save(caseEntity);
        return mapToCaseResponseDTO(updatedCase);
    }

    private CaseResponseDTO mapToCaseResponseDTO(Case caseEntity) {
        if (caseEntity == null) {
            return null;
        }

        CaseResponseDTO responseDTO = new CaseResponseDTO();
        responseDTO.setId(caseEntity.getId());
        responseDTO.setCaseNum(caseEntity.getCaseNum());
        responseDTO.setTaxPeriod(caseEntity.getTaxPeriod());
        responseDTO.setTaxType(caseEntity.getTaxType());
        responseDTO.setStatus(caseEntity.getStatus() != null ? caseEntity.getStatus().toString() : null);
        responseDTO.setSummaryOfInformationCase(caseEntity.getSummaryOfInformationCase());
        responseDTO.setCreatedAt(caseEntity.getReportedDate());
        responseDTO.setUpdatedAt(caseEntity.getUpdatedAt());

        // Set tax payer info
        if (caseEntity.getTin() != null) {
            TaxPayerDTO taxPayerDTO = new TaxPayerDTO();
            taxPayerDTO.setTin(caseEntity.getTin().getTaxPayerTIN());
            taxPayerDTO.setName(caseEntity.getTin().getTaxPayerName());
            taxPayerDTO.setAddress(caseEntity.getTin().getTaxPayerAddress());
            responseDTO.setTaxPayer(taxPayerDTO);
        }

        // Set informer info
        if (caseEntity.getInformerId() != null) {
            InformerDTO informerDTO = new InformerDTO();
            informerDTO.setNationalId(caseEntity.getInformerId().getNationalId());
            informerDTO.setName(caseEntity.getInformerId().getInformerName());
            informerDTO.setPhoneNum(caseEntity.getInformerId().getInformerPhoneNum());
            informerDTO.setAddress(caseEntity.getInformerId().getInformerAddress());
            informerDTO.setEmail(caseEntity.getInformerId().getInformerEmail());
            responseDTO.setInformer(informerDTO);
        }

        // Set creator name
        if (caseEntity.getCreatedBy() != null) {
            responseDTO.setCreatedByName(
                    (caseEntity.getCreatedBy().getGivenName() != null ? caseEntity.getCreatedBy().getGivenName() : "") + " " +
                            (caseEntity.getCreatedBy().getFamilyName() != null ? caseEntity.getCreatedBy().getFamilyName() : "")
            );
        }

        // Set referring officer info
        if (caseEntity.getReferringOfficer() != null) {
            responseDTO.setReferringOfficerName(
                    (caseEntity.getReferringOfficer().getGivenName() != null ? caseEntity.getReferringOfficer().getGivenName() : "") + " " +
                            (caseEntity.getReferringOfficer().getFamilyName() != null ? caseEntity.getReferringOfficer().getFamilyName() : "")
            );
            responseDTO.setReferringOfficerId(caseEntity.getReferringOfficer().getEmployeeId());
        }

        // Set report ID if exists
        if (caseEntity.getCaseNum() != null) {
            reportRepo.findByRelatedCase_CaseNum(caseEntity.getCaseNum())
                    .ifPresent(report -> responseDTO.setReportId(report.getId()));
        }

        return responseDTO;
    }

    @Transactional
    public void deleteCase(Integer caseId, String employeeId) {
        if (caseId == null || employeeId == null) {
            throw new IllegalArgumentException("Case ID and Employee ID cannot be null");
        }

        Case caseEntity = caseRepo.findById(caseId)
                .orElseThrow(() -> new RuntimeException("Case not found with ID: " + caseId));

        if (caseEntity.getCreatedBy() == null ||
                !caseEntity.getCreatedBy().getEmployeeId().equals(employeeId)) {
            throw new RuntimeException("Only case creator can delete the case");
        }

        // Check if case has reports
        if (caseEntity.getCaseNum() != null &&
                reportRepo.existsByRelatedCase_CaseNum(caseEntity.getCaseNum())) {
            throw new RuntimeException("Cannot delete case with existing reports");
        }

        caseRepo.delete(caseEntity);
        auditService.logAction(
                WorkflowStatus.CASE_DELETED,
                "Case " + caseEntity.getCaseNum() + " deleted by " + employeeId,
                caseEntity.getCreatedBy()
        );
    }
}