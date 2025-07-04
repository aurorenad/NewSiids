package org.example.siidsbackend.Controller;

import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CaseControllerTest {

    @Test
    void createCase() {
    }
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CaseRepo caseRepo;

    @Autowired
    private EmployeeRepo employeeRepo;

    private Employee testEmployee;
    private Case testCase;

    @BeforeEach
    void setup() {
        testEmployee = new Employee();
        testEmployee.setEmployeeId("TEST001");
        testEmployee.setGivenName("Test");
        testEmployee.setFamilyName("User");
        employeeRepo.save(testEmployee);

        testCase = new Case();
        testCase.setTin("123456789");
        testCase.setTaxPayerName("Test Company");
        testCase.setStatus(WorkflowStatus.CASE_CREATED);
        testCase.setCreatedBy(testEmployee);
        testCase = caseRepo.save(testCase);
    }

    @Test
    void createCase_ShouldReturnCreated() throws Exception {
        String requestBody = """
            {
                "informerId": "INF123",
                "informerName": "John Doe",
                "tin": "987654321",
                "taxPayerName": "New Company",
                "taxPayerType": "CORPORATION",
                "taxPeriod": "2023",
                "summaryOfInformationCase": "Test case"
            }
            """;

        mockMvc.perform(post("/api/cases")
                        .header("employee_id", "TEST001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taxPayerName").value("New Company"));
    }

}