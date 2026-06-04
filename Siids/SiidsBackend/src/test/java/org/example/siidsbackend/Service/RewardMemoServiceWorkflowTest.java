package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.RewardMemo;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.NotificationRepo;
import org.example.siidsbackend.Repository.ReportRepo;
import org.example.siidsbackend.Repository.RewardMemoRepo;
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
class RewardMemoServiceWorkflowTest {

    @Mock
    private RewardMemoRepo rewardMemoRepo;

    @Mock
    private CaseRepo caseRepo;

    @Mock
    private EmployeeRepo employeeRepo;

    @Mock
    private ReportRepo reportRepo;

    @Mock
    private NotificationRepo notificationRepo;

    @Mock
    private WebSocketNotificationService webSocketNotificationService;

    @Mock
    private FileStorageService fileStorageService;

    private RewardMemoService rewardMemoService;

    @BeforeEach
    void setUp() {
        rewardMemoService = new RewardMemoService(
                rewardMemoRepo,
                caseRepo,
                employeeRepo,
                reportRepo,
                notificationRepo,
                webSocketNotificationService,
                fileStorageService);
    }

    @Test
    void approveByDirector_WhenWrongStatus_ShouldRejectBeforeSaving() {
        Employee director = employee("director-1");
        RewardMemo memo = memoWithStatus(WorkflowStatus.REWARD_MEMO_SUBMITTED);

        when(rewardMemoRepo.findById(1)).thenReturn(Optional.of(memo));
        when(employeeRepo.findByEmployeeId("director-1")).thenReturn(Optional.of(director));

        assertThrows(IllegalStateException.class,
                () -> rewardMemoService.approveByDirector(1, "director-1"));

        verify(rewardMemoRepo, never()).save(memo);
    }

    @Test
    void approveByDirector_WhenRequesterIsNotAssignedOrDirector_ShouldRejectBeforeSaving() {
        Employee requester = employee("requester-1");
        RewardMemo memo = memoWithStatus(WorkflowStatus.REWARD_MEMO_SENT_TO_DIRECTOR_INTELLIGENCE);
        memo.setCurrentRecipient(employee("director-1"));

        when(rewardMemoRepo.findById(1)).thenReturn(Optional.of(memo));
        when(employeeRepo.findByEmployeeId("requester-1")).thenReturn(Optional.of(requester));
        when(reportRepo.DirectorsOfIntelligence()).thenReturn(List.of(employee("director-1")));

        assertThrows(SecurityException.class,
                () -> rewardMemoService.approveByDirector(1, "requester-1"));

        verify(rewardMemoRepo, never()).save(memo);
    }

    @Test
    void approveByAC_WhenWrongStatus_ShouldRejectBeforeSaving() {
        Employee ac = employee("ac-1");
        RewardMemo memo = memoWithStatus(WorkflowStatus.REWARD_MEMO_SENT_TO_DIRECTOR_INTELLIGENCE);

        when(rewardMemoRepo.findById(1)).thenReturn(Optional.of(memo));
        when(employeeRepo.findByEmployeeId("ac-1")).thenReturn(Optional.of(ac));

        assertThrows(IllegalStateException.class,
                () -> rewardMemoService.approveByAC(1, "ac-1"));

        verify(rewardMemoRepo, never()).save(memo);
    }

    @Test
    void processByFinance_WhenNotSentToFinance_ShouldRejectBeforeSaving() {
        RewardMemo memo = memoWithStatus(WorkflowStatus.REWARD_MEMO_SENT_TO_ASSISTANT_COMMISSIONER);

        when(rewardMemoRepo.findById(1)).thenReturn(Optional.of(memo));

        assertThrows(IllegalStateException.class,
                () -> rewardMemoService.processByFinance(1, "CHK-1"));

        verify(rewardMemoRepo, never()).save(memo);
    }

    @Test
    void rejectMemo_WhenCompleted_ShouldRejectBeforeSaving() {
        RewardMemo memo = memoWithStatus(WorkflowStatus.REWARD_PAYMENT_COMPLETED);

        when(rewardMemoRepo.findById(1)).thenReturn(Optional.of(memo));

        assertThrows(IllegalStateException.class,
                () -> rewardMemoService.rejectMemo(1, "No", "director-1"));

        verify(rewardMemoRepo, never()).save(memo);
    }

    private RewardMemo memoWithStatus(WorkflowStatus status) {
        RewardMemo memo = new RewardMemo();
        memo.setId(1);
        memo.setStatus(status);
        memo.setCreatedBy(employee("creator-1"));
        return memo;
    }

    private Employee employee(String employeeId) {
        Employee employee = new Employee();
        employee.setEmployeeId(employeeId);
        return employee;
    }
}
