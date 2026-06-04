package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
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
class ReportServiceAttachmentSecurityTest {

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
    void downloadReportAttachment_WhenRequesterIsNotReportParticipant_ShouldRejectBeforeAudit() {
        Employee creator = employee("creator-1");
        Employee requester = employee("requester-1");
        Report report = new Report();
        report.setId(1);
        report.setCreatedBy(creator);
        report.setAttachmentPaths(List.of("reports/file.pdf"));

        when(reportRepo.findById(1)).thenReturn(Optional.of(report));
        when(employeeRepo.findByEmployeeId("requester-1")).thenReturn(Optional.of(requester));
        when(reportRepo.DirectorsOfIntelligence()).thenReturn(List.of());
        when(reportRepo.DirectorsOfInvestigation()).thenReturn(List.of());
        when(reportRepo.assistantCommissioner()).thenReturn(List.of());
        when(reportRepo.findAvailableT3Officers()).thenReturn(List.of());

        assertThrows(RuntimeException.class,
                () -> reportService.downloadReportAttachment(1, "reports/file.pdf", "requester-1"));

        verify(auditService, never()).logAction(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any());
    }

    private Employee employee(String employeeId) {
        Employee employee = new Employee();
        employee.setEmployeeId(employeeId);
        return employee;
    }
}
