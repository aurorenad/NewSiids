package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.SeizureNote;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.PVDocumentRepository;
import org.example.siidsbackend.Repository.ReleaseNoteRepository;
import org.example.siidsbackend.Repository.SeizureNoteRepository;
import org.example.siidsbackend.Repository.StockRepository;
import org.example.siidsbackend.Repository.UserRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhysicalStockServiceTest {

    @Mock
    private SeizureNoteRepository seizureNoteRepository;

    @Mock
    private PVDocumentRepository pvDocumentRepository;

    @Mock
    private ReleaseNoteRepository releaseNoteRepository;

    @Mock
    private CaseRepo caseRepo;

    @Mock
    private StockRepository stockRepository;

    @Mock
    private StockAuditService auditService;

    @Mock
    private WebSocketNotificationService notificationService;

    @Mock
    private PdfService pdfService;

    @Mock
    private EmployeeRepo employeeRepo;

    @Mock
    private UserRepo userRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    private PhysicalStockService physicalStockService;

    @BeforeEach
    void setUp() {
        physicalStockService = new PhysicalStockService(
                seizureNoteRepository,
                pvDocumentRepository,
                releaseNoteRepository,
                caseRepo,
                stockRepository,
                auditService,
                notificationService,
                pdfService,
                employeeRepo,
                userRepo,
                passwordEncoder
        );
    }

    @Test
    void getSeizureHistory_ForAdmin_ShouldReturnAllHistory() {
        User admin = new User();
        admin.setUsername("admin");
        admin.setRole("Admin");
        List<SeizureNote> allHistory = List.of(new SeizureNote(), new SeizureNote());

        when(userRepo.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(seizureNoteRepository.findAllByOrderByCreatedAtDesc()).thenReturn(allHistory);

        List<SeizureNote> result = physicalStockService.getSeizureHistory("admin");

        assertSame(allHistory, result);
        verify(seizureNoteRepository).findAllByOrderByCreatedAtDesc();
        verify(employeeRepo, never()).findByEmployeeId("admin");
        verify(seizureNoteRepository, never()).findByPvInChargeOrderByCreatedAtDesc(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void getSeizureHistory_ForOfficer_ShouldReturnOnlyAssignedHistory() {
        User officerUser = new User();
        officerUser.setUsername("2207180163");
        officerUser.setRole("Surveillance");
        Employee officer = new Employee();
        List<SeizureNote> officerHistory = List.of(new SeizureNote());

        when(userRepo.findByUsername("2207180163")).thenReturn(Optional.of(officerUser));
        when(employeeRepo.findByEmployeeId("2207180163")).thenReturn(Optional.of(officer));
        when(seizureNoteRepository.findByPvInChargeOrderByCreatedAtDesc(officer)).thenReturn(officerHistory);

        List<SeizureNote> result = physicalStockService.getSeizureHistory("2207180163");

        assertSame(officerHistory, result);
        verify(seizureNoteRepository).findByPvInChargeOrderByCreatedAtDesc(officer);
        verify(seizureNoteRepository, never()).findAllByOrderByCreatedAtDesc();
    }
}
