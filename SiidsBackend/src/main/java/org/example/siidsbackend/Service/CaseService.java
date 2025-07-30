package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.CaseRequestDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.InformerRepository;
import org.example.siidsbackend.Repository.TaxPayerRepository;
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
    private final TaxPayerRepository taxPayerRepo;
    private final InformerRepository informerRepo;


    public Case createCase(CaseRequestDTO dto, String employeeId, TaxPayer taxPayer, Informer informer, Employee referringOfficer) {
        log.info("Creating case for employee: {}", employeeId);

        Employee creator = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + employeeId));

        Case newCase = new Case();
        newCase.setInformerId(informer);
        newCase.setTin(taxPayer);
        newCase.setSummaryOfInformationCase(dto.getSummaryOfInformationCase());
        newCase.setStatus(WorkflowStatus.CASE_CREATED);
        newCase.setTaxPeriod(dto.getTaxPeriod());
        newCase.setCreatedBy(creator);
        newCase.setReportedDate(LocalDateTime.now());
        newCase.setUpdatedAt(LocalDateTime.now());

        // Use the referringOfficer parameter that was passed in
        if (referringOfficer != null) {
            newCase.setReferringOfficer(referringOfficer);
        }

        Case savedCase = caseRepo.save(newCase);
        savedCase.setCaseNum(savedCase.generateCaseNumber());
        return caseRepo.save(savedCase);
    }

    public List<Case> getCasesByCreator(String employeeId) {
        employeeId = employeeId.trim();
        log.info("Fetching cases for employee: {}", employeeId);
        return caseRepo.findByCreatedBy_EmployeeId(employeeId);
    }

    public Optional<Case> getCaseIfCreator(Integer caseId, String employeeId) {
        log.info("Fetching case {} for employee: {}", caseId, employeeId);
        return caseRepo.findById(caseId)
                .filter(caseObj -> caseObj.getCreatedBy().getEmployeeId().equals(employeeId));
    }

    public Case updateCaseStatus(Integer id, String employeeId, WorkflowStatus newStatus) {
        log.info("Updating case {} status to {} for employee: {}", id, newStatus, employeeId);

        Optional<Case> caseOpt = getCaseIfCreator(id, employeeId);
        if (caseOpt.isEmpty()) {
            log.warn("Case {} not found or not owned by employee {}", id, employeeId);
            return null;
        }

        Case existingCase = caseOpt.get();
        existingCase.setStatus(newStatus);
        existingCase.setUpdatedAt(LocalDateTime.now());

        return caseRepo.save(existingCase);
    }

    public Optional<Case> getCaseByCaseNum(String caseNum, String employeeId) {
        log.info("Fetching case by number {} for employee: {}", caseNum, employeeId);
        return caseRepo.findByCaseNum(caseNum)
                .filter(caseObj -> caseObj.getCreatedBy().getEmployeeId().equals(employeeId));
    }

    // Additional method to get case by case number without employee restriction (for admin use)
    public Optional<Case> getCaseByCaseNumAdmin(String caseNum) {
        log.info("Fetching case by number {} (admin access)", caseNum);
        return caseRepo.findByCaseNum(caseNum);
    }

    // Method to get case by ID without employee restriction (for admin use)
    public Optional<Case> getCaseByIdAdmin(Integer caseId) {
        log.info("Fetching case by ID {} (admin access)", caseId);
        return caseRepo.findById(caseId);
    }

    // Method to update case without employee restriction (for system use)
    public Case updateCaseStatusSystem(Integer id, WorkflowStatus newStatus) {
        log.info("Updating case {} status to {} (system update)", id, newStatus);

        Optional<Case> caseOpt = caseRepo.findById(id);
        if (caseOpt.isEmpty()) {
            log.warn("Case {} not found", id);
            return null;
        }

        Case existingCase = caseOpt.get();
        existingCase.setStatus(newStatus);
        existingCase.setUpdatedAt(LocalDateTime.now());

        return caseRepo.save(existingCase);
    }
}