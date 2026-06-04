package org.example.siidsbackend.Service;

import org.example.siidsbackend.DTO.Request.CaseRequestDTO;
import org.example.siidsbackend.DTO.Response.CaseResponseDTO;
import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.TaxPayer;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.ReportRepo;
import org.example.siidsbackend.Repository.UserRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CaseServiceTest {

    @Mock
    private CaseRepo caseRepo;

    @Mock
    private EmployeeRepo employeeRepo;

    @Mock
    private ReportRepo reportRepo;

    @Mock
    private AuditService auditService;

    @Mock
    private UserRepo userRepo;

    @Mock
    private RbacService rbacService;

    private CaseService caseService;

    @BeforeEach
    void setUp() {
        caseService = new CaseService(
                caseRepo,
                employeeRepo,
                reportRepo,
                auditService,
                userRepo,
                rbacService
        );
    }

    @Test
    void createCase_ShouldPersistIntakeDetails() {
        Employee creator = new Employee();
        creator.setEmployeeId("officer-1");

        TaxPayer taxPayer = new TaxPayer();
        taxPayer.setTaxPayerTIN("123456789");

        CaseRequestDTO request = new CaseRequestDTO();
        request.setTin("123456789");
        request.setSummaryOfInformationCase("Possible under declaration");
        request.setEstimatedEvasionAmount(1500000.0);
        request.setIntakeChannel("EMAIL");
        request.setPriorityClassification("HIGH");
        request.setInformerIdType("NATIONAL_ID");

        final Case[] saved = new Case[1];

        when(employeeRepo.findById("officer-1")).thenReturn(Optional.of(creator));
        when(caseRepo.save(any(Case.class))).thenAnswer(invocation -> {
            Case savedCase = invocation.getArgument(0);
            if (savedCase.getId() == null) {
                savedCase.setId(7);
            }
            saved[0] = savedCase;
            return savedCase;
        });
        when(caseRepo.findById(7)).thenAnswer(invocation -> Optional.of(saved[0]));

        Case createdCase = caseService.createCase(request, "officer-1", taxPayer, null);
        CaseResponseDTO response = caseService.getCaseResponseById(createdCase.getId());

        assertEquals(1500000.0, createdCase.getEstimatedEvasionAmount());
        assertEquals("EMAIL", createdCase.getIntakeChannel());
        assertEquals("HIGH", createdCase.getPriorityClassification());
        assertEquals("NATIONAL_ID", createdCase.getInformerIdType());
        assertEquals(1500000.0, response.getEstimatedEvasionAmount());
        assertEquals("EMAIL", response.getIntakeChannel());
        assertEquals("HIGH", response.getPriorityClassification());
        assertEquals("NATIONAL_ID", response.getInformerIdType());
    }
}
