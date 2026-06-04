package org.example.siidsbackend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityAuthorizationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicRegistrationIsDisabled() throws Exception {
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isGone());
    }

    @Test
    @WithMockUser(authorities = "REPORT_VIEW")
    void adminUserCreationRequiresUserCreatePermission() throws Exception {
        mockMvc.perform(post("/admin/register-user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "USER_VIEW")
    void roleUpdateRequiresRoleUpdatePermission() throws Exception {
        mockMvc.perform(put("/users/1/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"Admin\",\"reason\":\"test\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "USER_VIEW")
    void auditLogsRequireAuditViewPermission() throws Exception {
        mockMvc.perform(get("/api/audit/audit-logs"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "REPORT_VIEW")
    void reportApprovalRequiresApprovalPermission() throws Exception {
        mockMvc.perform(post("/api/reports/1/approve"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "STOCK_VIEW")
    void stockReleaseApprovalRequiresReleaseApprovalPermission() throws Exception {
        mockMvc.perform(patch("/api/stock/goods/1/approve-release"))
                .andExpect(status().isForbidden());
    }
}
