package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.NotificationDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardMemoService {
    private static final Set<String> REWARD_MEMO_ATTACHMENT_EXTENSIONS = Set.of(
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg");

    private final RewardMemoRepo rewardMemoRepo;
    private final CaseRepo caseRepo;
    private final EmployeeRepo employeeRepo;
    private final ReportRepo reportRepo;
    private final NotificationRepo notificationRepo;
    private final WebSocketNotificationService webSocketNotificationService;
    private final FileStorageService fileStorageService;

    @Transactional
    public RewardMemo submitRewardMemo(String caseNum, String employeeId, Double amount, String description, List<MultipartFile> attachments) throws IOException {
        Case relatedCase = caseRepo.findByCaseNum(caseNum)
                .orElseThrow(() -> new RuntimeException("Case not found"));
        Employee creator = employeeRepo.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        RewardMemo memo = new RewardMemo();
        memo.setRelatedCase(relatedCase);
        memo.setInformer(relatedCase.getInformerId());
        memo.setCreatedBy(creator);
        memo.setRewardAmount(amount);
        memo.setDescription(description);
        memo.setStatus(WorkflowStatus.REWARD_MEMO_SUBMITTED);
        
        // Handle attachments
        if (attachments != null && !attachments.isEmpty()) {
            for (MultipartFile file : attachments) {
                String storedPath = fileStorageService.store(file, "reward-memos", REWARD_MEMO_ATTACHMENT_EXTENSIONS);
                if (storedPath != null) {
                    memo.getAttachmentPaths().add(storedPath);
                }
            }
        }

        // Send to Director of Intelligence
        List<Employee> directors = reportRepo.DirectorsOfIntelligence();
        if (!directors.isEmpty()) {
            memo.setCurrentRecipient(directors.get(0));
            memo.setStatus(WorkflowStatus.REWARD_MEMO_SENT_TO_DIRECTOR_INTELLIGENCE);
        }

        RewardMemo savedMemo = rewardMemoRepo.save(memo);
        createNotification(savedMemo, "New Reward Memo submitted for your review.");
        return savedMemo;
    }

    @Transactional
    public RewardMemo approveByDirector(Integer memoId, String directorId) {
        RewardMemo memo = rewardMemoRepo.findById(memoId)
                .orElseThrow(() -> new RuntimeException("Memo not found"));
        Employee director = employeeRepo.findByEmployeeId(directorId)
                .orElseThrow(() -> new RuntimeException("Director not found"));
        requireStatus(memo, WorkflowStatus.REWARD_MEMO_SENT_TO_DIRECTOR_INTELLIGENCE);
        requireCurrentRecipientOrListedEmployee(memo, directorId, reportRepo.DirectorsOfIntelligence(),
                "Only the assigned Director of Intelligence can approve this reward memo");

        memo.setDirectorIntelligence(director);
        memo.setStatus(WorkflowStatus.REWARD_MEMO_SENT_TO_ASSISTANT_COMMISSIONER);
        
        List<Employee> commissioners = reportRepo.assistantCommissioner();
        if (!commissioners.isEmpty()) {
            memo.setCurrentRecipient(commissioners.get(0));
        }

        RewardMemo savedMemo = rewardMemoRepo.save(memo);
        createNotification(savedMemo, "Reward Memo approved by Director, awaiting AC approval.");
        return savedMemo;
    }

    @Transactional
    public RewardMemo approveByAC(Integer memoId, String acId) {
        RewardMemo memo = rewardMemoRepo.findById(memoId)
                .orElseThrow(() -> new RuntimeException("Memo not found"));
        Employee ac = employeeRepo.findByEmployeeId(acId)
                .orElseThrow(() -> new RuntimeException("AC not found"));
        requireStatus(memo, WorkflowStatus.REWARD_MEMO_SENT_TO_ASSISTANT_COMMISSIONER);
        requireCurrentRecipientOrListedEmployee(memo, acId, reportRepo.assistantCommissioner(),
                "Only the assigned Assistant Commissioner can approve this reward memo");

        memo.setAssistantCommissioner(ac);
        memo.setStatus(WorkflowStatus.REWARD_MEMO_APPROVED_BY_ASSISTANT_COMMISSIONER);
        memo.setApprovedAt(LocalDateTime.now());
        
        // Status: Send to Finance
        memo.setStatus(WorkflowStatus.REWARD_MEMO_SENT_TO_FINANCE);
        
        // In a real system, we'd find Finance users. For now, set status.
        memo.setCurrentRecipient(null); // Finance is another department

        RewardMemo savedMemo = rewardMemoRepo.save(memo);
        createNotification(savedMemo, "Reward Memo approved by AC and sent to Finance.");
        return savedMemo;
    }

    @Transactional
    public RewardMemo processByFinance(Integer memoId, String checkNumber) {
        RewardMemo memo = rewardMemoRepo.findById(memoId)
                .orElseThrow(() -> new RuntimeException("Memo not found"));
        requireStatus(memo, WorkflowStatus.REWARD_MEMO_SENT_TO_FINANCE);
        if (checkNumber == null || checkNumber.isBlank()) {
            throw new IllegalArgumentException("Bank check number is required");
        }
        
        memo.setProcessedByFinance(true);
        memo.setFinanceProcessedAt(LocalDateTime.now());
        memo.setBankCheckNumber(checkNumber);
        memo.setStatus(WorkflowStatus.REWARD_PAYMENT_COMPLETED);
        
        // Set recipient back to creator (Intelligence Officer) to finalize
        memo.setCurrentRecipient(memo.getCreatedBy());

        RewardMemo savedMemo = rewardMemoRepo.save(memo);
        createNotification(savedMemo, "Reward payment processed by Finance. Ref: " + checkNumber);
        return savedMemo;
    }

    @Transactional
    public RewardMemo rejectMemo(Integer memoId, String reason, String rejectorId) {
        RewardMemo memo = rewardMemoRepo.findById(memoId)
                .orElseThrow(() -> new RuntimeException("Memo not found"));
        if (memo.getStatus() == WorkflowStatus.REWARD_MEMO_SENT_TO_DIRECTOR_INTELLIGENCE) {
            requireCurrentRecipientOrListedEmployee(memo, rejectorId, reportRepo.DirectorsOfIntelligence(),
                    "Only the assigned Director of Intelligence can reject this reward memo");
        } else if (memo.getStatus() == WorkflowStatus.REWARD_MEMO_SENT_TO_ASSISTANT_COMMISSIONER) {
            requireCurrentRecipientOrListedEmployee(memo, rejectorId, reportRepo.assistantCommissioner(),
                    "Only the assigned Assistant Commissioner can reject this reward memo");
        } else {
            throw new IllegalStateException("Reward memo cannot be rejected from status: " + memo.getStatus());
        }
        
        memo.setStatus(WorkflowStatus.REWARD_MEMO_REJECTED);
        memo.setRejectionReason(reason);
        memo.setRejectedAt(LocalDateTime.now());
        memo.setCurrentRecipient(memo.getCreatedBy());

        RewardMemo savedMemo = rewardMemoRepo.save(memo);
        createNotification(savedMemo, "Reward Memo rejected. Reason: " + reason);
        return savedMemo;
    }

    public List<RewardMemo> getMemosForUser(String employeeId) {
        return rewardMemoRepo.findByCurrentRecipient_EmployeeId(employeeId);
    }

    public List<RewardMemo> getMyMemos(String employeeId) {
        return rewardMemoRepo.findByCreatedBy_EmployeeId(employeeId);
    }

    private void requireStatus(RewardMemo memo, WorkflowStatus expectedStatus) {
        if (memo.getStatus() != expectedStatus) {
            throw new IllegalStateException(
                    "Reward memo must be in status " + expectedStatus + " but was " + memo.getStatus());
        }
    }

    private void requireCurrentRecipientOrListedEmployee(
            RewardMemo memo,
            String employeeId,
            List<Employee> allowedEmployees,
            String message) {
        boolean isCurrentRecipient = memo.getCurrentRecipient() != null
                && employeeId.equals(memo.getCurrentRecipient().getEmployeeId());
        boolean isListedEmployee = allowedEmployees != null
                && allowedEmployees.stream().anyMatch(employee -> employeeId.equals(employee.getEmployeeId()));
        if (!isCurrentRecipient && !isListedEmployee) {
            throw new SecurityException(message);
        }
    }

    private void createNotification(RewardMemo memo, String message) {
        if (memo.getCurrentRecipient() != null) {
            Notification notification = new Notification();
            notification.setMessage(message);
            notification.setRecipient(memo.getCurrentRecipient());
            notification.setCreatedAt(LocalDateTime.now());
            notificationRepo.save(notification);
            
            // Send websocket notification
            NotificationDTO dto = new NotificationDTO();
            dto.setMessage(message);
            dto.setRecipientId(memo.getCurrentRecipient().getEmployeeId());
            dto.setNotificationType("REWARD_MEMO_UPDATE");
            webSocketNotificationService.sendNotificationToUser(memo.getCurrentRecipient().getEmployeeId(), dto);
        }
    }
}
