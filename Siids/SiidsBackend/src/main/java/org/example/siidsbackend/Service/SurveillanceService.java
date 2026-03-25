package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SurveillanceService {
    private final SurveillanceMappingRepo mappingRepo;
    private final SurveillanceReportRepo reportRepo;
    private final EmployeeRepo employeeRepo;
    private final StockRepository stockRepo;

    @Transactional
    public SurveillanceMapping createMapping(String target, String location, String route, String items, List<String> officerIds, String creatorId) {
        Employee creator = employeeRepo.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("Creator not found"));
        
        SurveillanceMapping mapping = new SurveillanceMapping();
        mapping.setTargetName(target);
        mapping.setLocation(location);
        mapping.setSmugglingRoute(route);
        mapping.setSuspectedItems(items);
        mapping.setCreatedBy(creator);
        mapping.setStatus(WorkflowStatus.IN_PROGRESS);

        if (officerIds != null) {
            List<Employee> officers = employeeRepo.findAllById(officerIds);
            mapping.setAssignedOfficers(officers);
        }

        return mappingRepo.save(mapping);
    }

    @Transactional
    public SurveillanceReport submitReport(Integer mappingId, String findings, String interrogation, String pvNum, String seizureNum, Integer stockId, List<String> attachments, String creatorId) {
        Employee creator = employeeRepo.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("Creator not found"));
        
        SurveillanceMapping mapping = mappingRepo.findById(mappingId)
                .orElseThrow(() -> new RuntimeException("Mapping not found"));

        SurveillanceReport report = new SurveillanceReport();
        report.setMapping(mapping);
        report.setFindings(findings);
        report.setInterrogationDetails(interrogation);
        report.setPvNumber(pvNum);
        report.setSeizureNoteNumber(seizureNum);
        report.setCreatedBy(creator);
        report.setStatus(WorkflowStatus.SURVEILLANCE_REPORT_SUBMITTED);
        report.setAttachmentPaths(attachments);

        if (stockId != null) {
            Stock stock = stockRepo.findById(stockId)
                    .orElseThrow(() -> new RuntimeException("Stock not found"));
            report.setLinkedStock(stock);
        }

        SurveillanceReport saved = reportRepo.save(report);
        
        // Notify PRSO/Director for review (Simplified here)
        log.info("Surveillance report submitted: {}", saved.getId());
        return saved;
    }

    @Transactional
    public SurveillanceReport approveReportPRSO(Integer reportId, String prsoId) {
        SurveillanceReport report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));
        
        report.setStatus(WorkflowStatus.SURVEILLANCE_REPORT_APPROVED_BY_PRSO);
        // In a real flow, we would set the next recipient (e.g., AC)
        return reportRepo.save(report);
    }

    @Transactional
    public SurveillanceReport submitToAC(Integer reportId) {
        SurveillanceReport report = reportRepo.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));
        
        report.setStatus(WorkflowStatus.SURVEILLANCE_REPORT_SENT_TO_AC);
        return reportRepo.save(report);
    }
    
    public List<SurveillanceReport> getPendingReports() {
        return reportRepo.findByStatus(WorkflowStatus.SURVEILLANCE_REPORT_SUBMITTED);
    }
}
