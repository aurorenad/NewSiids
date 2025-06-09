package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.CaseRequestDTO;
import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CaseService {

    private final CaseRepo caseRepo;
    private final EmployeeRepo employeeRepo;

    public Case createCase(CaseRequestDTO dto, String employeeId) {
        log.info("Creating case for employee: {}", employeeId);

        Employee creator = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + employeeId));

        Case newCase = new Case();
        newCase.setInformerId(dto.getInformerId());
        newCase.setInformerName(dto.getInformerName());
        newCase.setTin(dto.getTin());
        newCase.setTaxPayerName(dto.getTaxPayerName());
        newCase.setTaxPayerType(dto.getTaxPayerType());
        newCase.setTaxPayerAddress(dto.getTaxPayerAddress());
        newCase.setTaxPeriod(dto.getTaxPeriod());
        newCase.setSummaryOfInformationCase(dto.getSummaryOfInformationCase());
        newCase.setStatus(WorkflowStatus.CASE_CREATED);
        newCase.setCreatedBy(creator);
        newCase.setReportedDate(LocalDateTime.now());

        Case savedCase = caseRepo.save(newCase);
        log.info("Successfully created case with ID: {}", savedCase.getCaseNum());
        return savedCase;
    }

    public List<Case> getCasesByCreator(String employeeId) {
        employeeId = employeeId.trim();
        log.info("Fetching cases for employee: {}", employeeId);

        String finalEmployeeId = employeeId;
        Employee creator = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + finalEmployeeId));

        List<Case> cases = caseRepo.findByCreatedBy_EmployeeId(employeeId);
        log.info("Found {} cases for employee: {}", cases.size(), employeeId);
        return cases;
    }

    public Optional<Case> getCaseIfCreator(Integer caseNum, String employeeId) {
        log.info("Fetching case {} for employee: {}", caseNum, employeeId);
        return caseRepo.findByCaseNumAndCreatedBy_EmployeeId(caseNum, employeeId);
    }

    public Case updateCaseStatus(Integer caseNum, String employeeId, WorkflowStatus newStatus) {
        log.info("Updating case {} status to {} for employee: {}", caseNum, newStatus, employeeId);

        Optional<Case> caseOpt = getCaseIfCreator(caseNum, employeeId);
        if (caseOpt.isEmpty()) {
            log.warn("Case {} not found or not owned by employee {}", caseNum, employeeId);
            return null;
        }

        Case existingCase = caseOpt.get();
        existingCase.setStatus(newStatus);
        existingCase.setUpdatedAt(LocalDateTime.now());

        Case updatedCase = caseRepo.save(existingCase);
        log.info("Successfully updated case {} status to {}", caseNum, newStatus);
        return updatedCase;
    }
}