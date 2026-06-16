package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Repository.CaseRepo;
import java.util.Set;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.NotificationRepo;
import org.example.siidsbackend.Repository.ReportRepo;
import org.example.siidsbackend.Repository.StructureRepository;
import org.example.siidsbackend.Repository.UserRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceDownloadAttachmentTest {

    @TempDir
    Path tempDir;

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

    @Test
    void downloadReportAttachment_ShouldReturnFileResourceWithOriginalFilename() throws Exception {
        FileStorageService storageService = new FileStorageService(tempDir.toString());

        String storedFilename = "6ce69383-1fff-4c2c-8df1-f1b8fceae1d9_Doc3.pdf";
        String storedPath = storageService.storeBytes("%PDF-1.7\ninfo".getBytes(), storedFilename, "", Set.of(".pdf"));

        Employee requester = new Employee();
        requester.setEmployeeId("user-1");

        Report report = new Report();
        report.setId(14);
        report.setCreatedBy(requester);
        report.setAttachmentPaths(List.of(storedFilename));

        when(reportRepo.findByIdWithAttachments(14)).thenReturn(Optional.of(report));
        when(employeeRepo.findByEmployeeId("user-1")).thenReturn(Optional.of(requester));
        // requester is the report creator, so access is granted without checking director/officer lists

        ReportService reportService = new ReportService(
                reportRepo,
                employeeRepo,
                caseRepo,
                notificationRepo,
                structureRepo,
                webSocketNotificationService,
                auditService,
                userRepo,
                rbacService,
                storageService
        );

        ResponseEntity<Resource> response = reportService.downloadReportAttachment(14, storedFilename, "user-1");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("attachment; filename=\"Doc3.pdf\"", response.getHeaders().getFirst("Content-Disposition"));
        assertTrue(response.getBody().exists());
    }
}
