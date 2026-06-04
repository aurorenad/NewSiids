package org.example.siidsbackend.Service;

import org.example.siidsbackend.DTO.Request.ReportRequestDTO;
import org.example.siidsbackend.DTO.Request.SignReportRequest;
import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Model.ReportSignature;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.NotificationRepo;
import org.example.siidsbackend.Repository.ReportRepo;
import org.example.siidsbackend.Repository.StructureRepository;
import org.example.siidsbackend.Repository.UserRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceWorkflowTest {

    @Mock
    private ReportRepo reportRepo;

    @Mock
    private EmployeeRepo employeeRepo;

    @Mock
    private CaseRepo caseRepo;

    @Mock
    private NotificationRepo notificationRepo;

    @Mock
    private StructureRepository structureRepo;

    @Mock
    private WebSocketNotificationService webSocketNotificationService;

    @Mock
    private AuditService auditService;

    @Mock
    private UserRepo userRepo;

    @Mock
    private RbacService rbacService;

    @Mock
    private FileStorageService fileStorageService;

    private ReportService reportService;

    @BeforeEach
    void setUp() {
        reportService = new ReportService(
                reportRepo,
                employeeRepo,
                caseRepo,
                notificationRepo,
                structureRepo,
                webSocketNotificationService,
                auditService,
                userRepo,
                rbacService,
                fileStorageService
        );
    }

    @Test
    void approveCasePlan_WithWrongState_ShouldRejectBeforeSaving() {
        Employee director = employee("director-1");
        Report report = reportWithStatus(WorkflowStatus.CASE_PLAN_SUBMITTED);

        when(reportRepo.findById(1)).thenReturn(Optional.of(report));
        when(employeeRepo.findByEmployeeId("director-1")).thenReturn(Optional.of(director));
        when(reportRepo.DirectorsOfInvestigation()).thenReturn(List.of(director));

        assertThrows(IllegalStateException.class,
                () -> reportService.approveCasePlan(1, "director-1"));

        verify(caseRepo, never()).save(org.mockito.ArgumentMatchers.any());
        verify(reportRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejectCasePlan_WithWrongState_ShouldRejectBeforeSaving() {
        Employee director = employee("director-1");
        Report report = reportWithStatus(WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION);

        when(reportRepo.findById(1)).thenReturn(Optional.of(report));
        when(employeeRepo.findByEmployeeId("director-1")).thenReturn(Optional.of(director));
        when(reportRepo.DirectorsOfInvestigation()).thenReturn(List.of(director));

        assertThrows(IllegalStateException.class,
                () -> reportService.rejectCasePlan(1, "Needs more detail", "director-1"));

        verify(caseRepo, never()).save(org.mockito.ArgumentMatchers.any());
        verify(reportRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejectCasePlanByAssistantCommissioner_WithWrongState_ShouldRejectBeforeSaving() {
        Employee assistantCommissioner = employee("ac-1");
        Report report = reportWithStatus(WorkflowStatus.CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION);

        when(employeeRepo.findByEmployeeId("ac-1")).thenReturn(Optional.of(assistantCommissioner));
        when(reportRepo.assistantCommissioner()).thenReturn(List.of(assistantCommissioner));
        when(reportRepo.findById(1)).thenReturn(Optional.of(report));

        assertThrows(RuntimeException.class,
                () -> reportService.rejectCasePlanByAssistantCommissioner(1, "Needs more detail", "ac-1"));

        verify(caseRepo, never()).save(org.mockito.ArgumentMatchers.any());
        verify(reportRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejectInvestigationReport_WithWrongState_ShouldRejectBeforeSaving() {
        Employee director = employee("director-1");
        Report report = reportWithStatus(WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE);

        when(reportRepo.findById(1)).thenReturn(Optional.of(report));
        when(employeeRepo.findByEmployeeId("director-1")).thenReturn(Optional.of(director));

        assertThrows(IllegalStateException.class,
                () -> reportService.rejectInvestigationReport(1, "Not enough evidence", "director-1"));

        verify(caseRepo, never()).save(org.mockito.ArgumentMatchers.any());
        verify(reportRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void returnInvestigationReport_WithWrongState_ShouldRejectBeforeSaving() {
        Employee director = employee("director-1");
        Report report = reportWithStatus(WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION);

        when(reportRepo.findById(1)).thenReturn(Optional.of(report));
        when(employeeRepo.findByEmployeeId("director-1")).thenReturn(Optional.of(director));
        when(reportRepo.DirectorsOfInvestigation()).thenReturn(List.of(director));

        assertThrows(IllegalStateException.class,
                () -> reportService.returnInvestigationReport(1, "Revise assessment", "director-1"));

        verify(caseRepo, never()).save(org.mockito.ArgumentMatchers.any());
        verify(reportRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void createReport_ShouldPersistSubjectAndLegalBasis() {
        Employee creator = employee("officer-1");
        Case relatedCase = new Case();
        relatedCase.setCaseNum("CS/26/06/1");

        ReportRequestDTO request = new ReportRequestDTO();
        request.setCaseNum("CS/26/06/1");
        request.setDescription("Initial intelligence report");
        request.setSubject("Suspected VAT evasion");
        request.setLegalBasis("Income Tax Law article reference");

        when(employeeRepo.findByEmployeeId("officer-1")).thenReturn(Optional.of(creator));
        when(caseRepo.findByCaseNum("CS/26/06/1")).thenReturn(Optional.of(relatedCase));
        when(reportRepo.DirectorsOfIntelligence()).thenReturn(List.of(employee("director-intel-1")));
        when(reportRepo.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Report createdReport = reportService.createReport(request, List.of(), "officer-1");

        assertEquals("Suspected VAT evasion", createdReport.getSubject());
        assertEquals("Income Tax Law article reference", createdReport.getLegalBasis());
        assertEquals("Suspected VAT evasion", reportService.toResponseDTO(createdReport).getSubject());
        assertEquals("Income Tax Law article reference", reportService.toResponseDTO(createdReport).getLegalBasis());
    }

    @Test
    void toResponseDTO_WithAssistantCommissionerAndDirectorSignatures_ShouldExposeFinalisedState() {
        Employee assistantCommissioner = employee("ac-1");
        assistantCommissioner.setGivenName("Assistant");
        assistantCommissioner.setFamilyName("Commissioner");
        Employee director = employee("director-1");
        director.setGivenName("Director");
        director.setFamilyName("Intelligence");

        Report report = reportWithStatus(WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION);
        Employee creator = employee("creator-1");
        creator.setGivenName("Case");
        creator.setFamilyName("Creator");
        report.setCreatedBy(creator);
        report.setSignatures(List.of(
                signature(report, assistantCommissioner, "ASSISTANT_COMMISSIONER"),
                signature(report, director, "DIRECTOR_INTELLIGENCE")
        ));

        var response = reportService.toResponseDTO(report);

        assertEquals(2, response.getSignatures().size());
        assertEquals(true, response.isAcSigned());
        assertEquals(true, response.isDirectorSigned());
        assertEquals(true, response.isFinalised());
    }

    @Test
    void signReport_AsDirectorIntelligence_ShouldAddDirectorSignature() {
        User directorUser = new User();
        directorUser.setUsername("director-1");
        directorUser.setRole("DirectorIntelligence");
        Employee director = employee("director-1");
        Report report = reportWithStatus(WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE);

        SignReportRequest request = new SignReportRequest();
        request.setRole("DIRECTOR_INTELLIGENCE");
        request.setSignatureBase64("director-signature");

        when(userRepo.findByUsername("director-1")).thenReturn(Optional.of(directorUser));
        when(rbacService.hasRole(directorUser, "DirectorIntelligence")).thenReturn(true);
        when(reportRepo.findById(1)).thenReturn(Optional.of(report));
        when(employeeRepo.findByEmployeeId("director-1")).thenReturn(Optional.of(director));
        when(reportRepo.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Report signed = reportService.signReport(1, request, "director-1");

        assertEquals(1, signed.getSignatures().size());
        assertEquals("DIRECTOR_INTELLIGENCE", signed.getSignatures().get(0).getSignatureRole());
        assertEquals("director-signature", signed.getSignatures().get(0).getSignaturePath());
    }

    @Test
    void signReport_WithWrongRole_ShouldRejectBeforeSaving() {
        User directorUser = new User();
        directorUser.setUsername("director-1");
        directorUser.setRole("DirectorIntelligence");

        SignReportRequest request = new SignReportRequest();
        request.setRole("ASSISTANT_COMMISSIONER");
        request.setSignatureBase64("bad-signature");

        when(userRepo.findByUsername("director-1")).thenReturn(Optional.of(directorUser));

        assertThrows(SecurityException.class,
                () -> reportService.signReport(1, request, "director-1"));

        verify(reportRepo, never()).save(any());
    }

    private Report reportWithStatus(WorkflowStatus status) {
        Case relatedCase = new Case();
        relatedCase.setStatus(status);

        Report report = new Report();
        report.setId(1);
        report.setRelatedCase(relatedCase);
        return report;
    }

    private ReportSignature signature(Report report, Employee signer, String role) {
        ReportSignature signature = new ReportSignature();
        signature.setReport(report);
        signature.setSignedBy(signer);
        signature.setSignatureRole(role);
        signature.setSignaturePath("base64-signature");
        return signature;
    }

    private Employee employee(String employeeId) {
        Employee employee = new Employee();
        employee.setEmployeeId(employeeId);
        return employee;
    }
}
