package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.CaseRequestDTO;
import org.example.siidsbackend.DTO.Response.CaseResponseDTO;
import org.example.siidsbackend.DTO.Response.PageResponseDTO;
import org.example.siidsbackend.DTO.InformerDTO;
import org.example.siidsbackend.DTO.TaxPayerDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.ReportRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
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
    private final org.example.siidsbackend.Repository.UserRepo userRepo;
    private final RbacService rbacService;

    @Transactional
    public Case createCase(CaseRequestDTO dto, String employeeId, TaxPayer taxPayer, Informer informer) {
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
        applyCaseIntakeDetails(newCase, dto);

        if (dto.getReferringDepartment() != null && !dto.getReferringDepartment().trim().isEmpty()) {
            newCase.setReferringDepartment(dto.getReferringDepartment().trim());
        }

        Case savedCase = caseRepo.save(newCase);
        savedCase.setCaseNum(savedCase.generateCaseNumber());
        Case finalCase = caseRepo.save(savedCase);

        return finalCase;
    }

    @Transactional
    public CaseResponseDTO updateCase(Integer id, CaseRequestDTO dto, String employeeId, TaxPayer taxPayer, Informer informer) {
        log.info("Updating case ID: {} for employee: {}", id, employeeId);

        if (id == null || dto == null || employeeId == null) {
            throw new IllegalArgumentException("ID, CaseRequestDTO, and employeeId cannot be null");
        }

        Case existingCase = caseRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Case not found with ID: " + id));

        // Check permission: Only creator can edit, and usually only if it's still in CASE_CREATED or REPORT_SUBMITTED status
        if (existingCase.getCreatedBy() == null || !existingCase.getCreatedBy().getEmployeeId().equals(employeeId)) {
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
            boolean isAdmin = rbacService.isAdmin(user);
            if (!isAdmin) {
                throw new RuntimeException("Only case creator or Admin can edit the case");
            }
        }

        // Allow editing in initial stages
        boolean isEditableStatus = existingCase.getStatus() == WorkflowStatus.CASE_CREATED || 
                                   existingCase.getStatus() == WorkflowStatus.REPORT_SUBMITTED;
        
        if (!isEditableStatus) {
            throw new RuntimeException("Cannot edit a case that is already in " + existingCase.getStatus() + " status");
        }

        existingCase.setInformerId(informer);
        existingCase.setTin(taxPayer);
        existingCase.setSummaryOfInformationCase(dto.getSummaryOfInformationCase());
        existingCase.setTaxType(dto.getTaxType());
        existingCase.setTaxPeriod(dto.getTaxPeriod());
        existingCase.setUpdatedAt(LocalDateTime.now());
        applyCaseIntakeDetails(existingCase, dto);

        if (dto.getReferringDepartment() != null && !dto.getReferringDepartment().trim().isEmpty()) {
            existingCase.setReferringDepartment(dto.getReferringDepartment().trim());
        }

        Case updatedCase = caseRepo.save(existingCase);
        return mapToCaseResponseDTO(updatedCase);
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

        org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
        if (rbacService.isAdmin(user)) {
            return caseRepo.findAll().stream()
                    .map(this::mapToCaseResponseDTO)
                    .collect(Collectors.toList());
        }

        return caseRepo.findByCreatedBy_EmployeeId(employeeId).stream()
                .map(this::mapToCaseResponseDTO)
                .collect(Collectors.toList());
    }

    public PageResponseDTO<CaseResponseDTO> getCasePageByCreator(
            String employeeId,
            int requestedPage,
            int requestedSize,
            String search,
            String category,
            boolean withReports,
            String sortDirection) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String normalizedCategory = category == null ? "all" : category.trim();
        boolean ascending = "asc".equalsIgnoreCase(sortDirection);

        List<CaseResponseDTO> rows = getCasesByCreator(employeeId).stream()
                .filter(caseItem -> matchesCaseCategory(caseItem, normalizedCategory))
                .filter(caseItem -> !withReports || caseItem.getReportId() != null)
                .filter(caseItem -> matchesCaseSearch(caseItem, normalizedSearch))
                .sorted((left, right) -> {
                    int comparison = Comparator.nullsLast(LocalDateTime::compareTo)
                            .compare(left.getCreatedAt(), right.getCreatedAt());
                    return ascending ? comparison : -comparison;
                })
                .toList();

        return toPageResponse(rows, requestedPage, requestedSize);
    }

    private boolean matchesCaseCategory(CaseResponseDTO caseItem, String category) {
        String status = caseItem.getStatus();
        return switch (category) {
            case "created" -> "CASE_CREATED".equals(status) || "REPORT_SUBMITTED".equals(status);
            case "pending" -> "REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE".equals(status);
            case "returned" -> isReturnedStatus(status);
            case "approved" -> "REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE".equals(status)
                    || "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER".equals(status)
                    || "REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION".equals(status);
            case "closed" -> "REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE".equals(status)
                    || "REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER".equals(status)
                    || "REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION".equals(status);
            case "withReports" -> caseItem.getReportId() != null;
            default -> true;
        };
    }

    private boolean isReturnedStatus(String status) {
        return "REPORT_RETURNED_TO_INTELLIGENCE_OFFICER".equals(status)
                || "REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION".equals(status)
                || "REPORT_RETURNED_ASSISTANT_COMMISSIONER".equals(status)
                || "REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE".equals(status);
    }

    private boolean matchesCaseSearch(CaseResponseDTO caseItem, String normalizedSearch) {
        return normalizedSearch.isBlank()
                || containsIgnoreCase(caseItem.getCaseNum(), normalizedSearch)
                || containsIgnoreCase(caseItem.getStatus(), normalizedSearch)
                || containsIgnoreCase(caseItem.getTaxType(), normalizedSearch)
                || containsIgnoreCase(caseItem.getTaxPeriod(), normalizedSearch)
                || containsIgnoreCase(caseItem.getCreatedByName(), normalizedSearch)
                || (caseItem.getReportId() != null && String.valueOf(caseItem.getReportId()).contains(normalizedSearch))
                || (caseItem.getTaxPayer() != null
                && (containsIgnoreCase(caseItem.getTaxPayer().getName(), normalizedSearch)
                || containsIgnoreCase(caseItem.getTaxPayer().getTin(), normalizedSearch)));
    }

    private boolean containsIgnoreCase(String value, String search) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(search);
    }

    private <T> PageResponseDTO<T> toPageResponse(List<T> rows, int requestedPage, int requestedSize) {
        int size = requestedSize > 0 ? Math.min(requestedSize, 100) : 10;
        int page = Math.max(requestedPage, 0);
        int totalElements = rows.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);
        return new PageResponseDTO<>(rows.subList(fromIndex, toIndex), page, size, totalElements, totalPages);
    }

    public Optional<CaseResponseDTO> getCaseIfCreator(Integer caseId, String employeeId) {
        if (caseId == null || employeeId == null) {
            throw new IllegalArgumentException("Case ID and Employee ID cannot be null");
        }

        org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
        if (rbacService.isAdmin(user)) {
            return caseRepo.findById(caseId)
                    .map(this::mapToCaseResponseDTO);
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

        boolean isCreator = existingCase.getCreatedBy() != null &&
                existingCase.getCreatedBy().getEmployeeId().equals(employeeId);

        if (!isCreator) {
            org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
            boolean isAuthorizedRole = rbacService.hasAnyRole(user,
                    "Admin",
                    "DirectorIntelligence",
                    "IntelligenceOfficer");

            if (!isAuthorizedRole) {
                throw new RuntimeException("Only case creator or authorized intelligence officers can update status");
            }
        }

        existingCase.setStatus(newStatus);
        existingCase.setUpdatedAt(LocalDateTime.now());

        Case updatedCase = caseRepo.save(existingCase);

        auditService.logAction(
                newStatus,
                "Case " + updatedCase.getCaseNum() + " status changed to " + newStatus + " by " + employeeId,
                existingCase.getCreatedBy());

        return mapToCaseResponseDTO(updatedCase);
    }

    public Optional<CaseResponseDTO> getCaseByCaseNum(String caseNum, String employeeId) {
        if (caseNum == null || employeeId == null) {
            throw new IllegalArgumentException("Case number and employee ID cannot be null");
        }

        org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
        if (rbacService.isAdmin(user)) {
            return caseRepo.findByCaseNum(caseNum)
                    .map(this::mapToCaseResponseDTO);
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

        org.example.siidsbackend.Model.User user = userRepo.findByUsername(employeeId).orElse(null);
        if (rbacService.isAdmin(user)) {
            return caseRepo.findByStatus(status).stream()
                    .map(this::mapToCaseResponseDTO)
                    .collect(Collectors.toList());
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
            taxPayerDTO.setContact(caseEntity.getTin().getTaxPayerContact());
            responseDTO.setTaxPayer(taxPayerDTO);
        }

        if (caseEntity.getInformerId() != null) {
            InformerDTO informerDTO = new InformerDTO();
            informerDTO.setNationalId(caseEntity.getInformerId().getNationalId());
            informerDTO.setName(caseEntity.getInformerId().getInformerName());
            informerDTO.setPhoneNum(caseEntity.getInformerId().getInformerPhoneNum());
            informerDTO.setAddress(caseEntity.getInformerId().getInformerAddress());
            informerDTO.setEmail(caseEntity.getInformerId().getInformerEmail());
            responseDTO.setInformer(informerDTO);
        }
        if (caseEntity.getCreatedBy() != null) {
            responseDTO.setCreatedByName(
                    (caseEntity.getCreatedBy().getGivenName() != null ? caseEntity.getCreatedBy().getGivenName() : "")
                            + " " +
                            (caseEntity.getCreatedBy().getFamilyName() != null
                                    ? caseEntity.getCreatedBy().getFamilyName()
                                    : ""));
        }

        responseDTO.setReferringDepartment(caseEntity.getReferringDepartment());
        responseDTO.setEstimatedEvasionAmount(caseEntity.getEstimatedEvasionAmount());
        responseDTO.setIntakeChannel(caseEntity.getIntakeChannel());
        responseDTO.setPriorityClassification(caseEntity.getPriorityClassification());
        responseDTO.setInformerIdType(caseEntity.getInformerIdType());

        if (caseEntity.getCaseNum() != null) {
            reportRepo.findFirstByRelatedCase_CaseNumOrderByCreatedAtDesc(caseEntity.getCaseNum())
                    .ifPresent(report -> responseDTO.setReportId(report.getId()));
        }

        return responseDTO;
    }

    private void applyCaseIntakeDetails(Case caseEntity, CaseRequestDTO dto) {
        caseEntity.setEstimatedEvasionAmount(dto.getEstimatedEvasionAmount());
        caseEntity.setIntakeChannel(normalize(dto.getIntakeChannel()));
        caseEntity.setPriorityClassification(normalize(dto.getPriorityClassification()));
        caseEntity.setInformerIdType(normalize(dto.getInformerIdType()));
    }

    private String normalize(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
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
                caseEntity.getCreatedBy());
    }
}
