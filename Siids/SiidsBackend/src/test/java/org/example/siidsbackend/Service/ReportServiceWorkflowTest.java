package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
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

import static org.junit.jupiter.api.Assertions.assertThrows;
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
                rbacService
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

    private Report reportWithStatus(WorkflowStatus status) {
        Case relatedCase = new Case();
        relatedCase.setStatus(status);

        Report report = new Report();
        report.setId(1);
        report.setRelatedCase(relatedCase);
        return report;
    }

    private Employee employee(String employeeId) {
        Employee employee = new Employee();
        employee.setEmployeeId(employeeId);
        return employee;
    }
}
