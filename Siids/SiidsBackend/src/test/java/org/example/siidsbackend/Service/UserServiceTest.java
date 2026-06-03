package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.AccountAuditLog;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Model.UserRoleHistory;
import org.example.siidsbackend.Repository.AccountAuditLogRepository;
import org.example.siidsbackend.Repository.UserRepo;
import org.example.siidsbackend.Repository.UserRoleHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepo userRepo;

    @Mock
    private UserRoleHistoryRepository userRoleHistoryRepository;

    @Mock
    private AccountAuditLogRepository accountAuditLogRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService();
        ReflectionTestUtils.setField(userService, "repo", userRepo);
        ReflectionTestUtils.setField(userService, "userRoleHistoryRepository", userRoleHistoryRepository);
        ReflectionTestUtils.setField(userService, "accountAuditLogRepository", accountAuditLogRepository);
    }

    @Test
    void updateUserRole_WithBlankReason_ShouldRejectBeforeSaving() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> userService.updateUserRole(1, "Admin", "admin", "  "));

        assertEquals("Role change reason is required", exception.getMessage());
        verify(userRepo, never()).findById(any());
        verify(userRepo, never()).save(any());
        verify(userRoleHistoryRepository, never()).save(any());
        verify(accountAuditLogRepository, never()).save(any());
    }

    @Test
    void updateUserRole_WithReason_ShouldSaveHistoryAndAuditDetails() {
        User user = new User();
        user.setId(1);
        user.setUsername("2207180163");
        user.setRole("Investigation Officer");

        when(userRepo.findById(1)).thenReturn(Optional.of(user));
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.updateUserRole(1, " Legal Advisor ", "admin", "Transferred to Legal unit");

        ArgumentCaptor<UserRoleHistory> historyCaptor = ArgumentCaptor.forClass(UserRoleHistory.class);
        ArgumentCaptor<AccountAuditLog> auditCaptor = ArgumentCaptor.forClass(AccountAuditLog.class);
        verify(userRoleHistoryRepository).save(historyCaptor.capture());
        verify(accountAuditLogRepository).save(auditCaptor.capture());

        assertEquals("Legal Advisor", user.getRole());
        assertEquals("Investigation Officer", historyCaptor.getValue().getPreviousRole());
        assertEquals("Legal Advisor", historyCaptor.getValue().getNewRole());
        assertEquals("admin", historyCaptor.getValue().getChangedBy());
        assertEquals("Transferred to Legal unit", historyCaptor.getValue().getReason());

        assertEquals("USER_ROLE_UPDATED", auditCaptor.getValue().getAction());
        assertEquals("2207180163", auditCaptor.getValue().getTargetUsername());
        assertEquals("admin", auditCaptor.getValue().getPerformedBy());
        assertTrue(auditCaptor.getValue().getDetails().contains("Reason: Transferred to Legal unit"));
    }
}
