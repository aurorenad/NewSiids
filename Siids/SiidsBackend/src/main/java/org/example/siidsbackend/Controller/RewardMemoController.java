package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.Model.RewardMemo;
import org.example.siidsbackend.Service.RewardMemoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reward-memos")
@RequiredArgsConstructor
@Slf4j
public class RewardMemoController {
    private final RewardMemoService rewardMemoService;

    private String getCurrentUser() {
        return org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<RewardMemo> submitRewardMemo(
            @RequestParam("caseNum") String caseNum,
            @RequestParam("amount") Double amount,
            @RequestParam("description") String description,
            @RequestParam(value = "attachments", required = false) List<MultipartFile> attachments) {
        String employeeId = getCurrentUser();
        try {
            RewardMemo memo = rewardMemoService.submitRewardMemo(caseNum, employeeId, amount, description, attachments);
            return ResponseEntity.ok(memo);
        } catch (Exception e) {
            log.error("Error submitting reward memo: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/approve-director")
    public ResponseEntity<RewardMemo> approveByDirector(
            @PathVariable Integer id) {
        String directorId = getCurrentUser();
        try {
            RewardMemo memo = rewardMemoService.approveByDirector(id, directorId);
            return ResponseEntity.ok(memo);
        } catch (Exception e) {
            log.error("Error approving reward memo by director: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/approve-ac")
    public ResponseEntity<RewardMemo> approveByAC(
            @PathVariable Integer id) {
        String acId = getCurrentUser();
        try {
            RewardMemo memo = rewardMemoService.approveByAC(id, acId);
            return ResponseEntity.ok(memo);
        } catch (Exception e) {
            log.error("Error approving reward memo by AC: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/process-finance")
    public ResponseEntity<RewardMemo> processByFinance(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        try {
            String checkNumber = body.get("checkNumber");
            RewardMemo memo = rewardMemoService.processByFinance(id, checkNumber);
            return ResponseEntity.ok(memo);
        } catch (Exception e) {
            log.error("Error processing reward memo by finance: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<RewardMemo> rejectMemo(
            @PathVariable Integer id,
            @RequestParam String reason) {
        String rejectorId = getCurrentUser();
        try {
            RewardMemo memo = rewardMemoService.rejectMemo(id, reason, rejectorId);
            return ResponseEntity.ok(memo);
        } catch (Exception e) {
            log.error("Error rejecting reward memo: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/my-memos")
    public ResponseEntity<List<RewardMemo>> getMyMemos() {
        String employeeId = getCurrentUser();
        return ResponseEntity.ok(rewardMemoService.getMyMemos(employeeId));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<RewardMemo>> getPendingMemos() {
        String employeeId = getCurrentUser();
        return ResponseEntity.ok(rewardMemoService.getMemosForUser(employeeId));
    }
}
