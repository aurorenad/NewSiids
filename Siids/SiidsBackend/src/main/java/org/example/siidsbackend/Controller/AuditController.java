package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.DTO.Response.PageResponseDTO;
import org.example.siidsbackend.Model.AuditLog;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/audit")
public class AuditController {
    private final AuditLogRepository auditLogRepository;

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public PageResponseDTO<AuditLog> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) WorkflowStatus action) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<AuditLog> logs = action == null
                ? auditLogRepository.findAll(pageable)
                : auditLogRepository.findByAction(action, pageable);

        return new PageResponseDTO<>(
                logs.getContent(),
                logs.getNumber(),
                logs.getSize(),
                logs.getTotalElements(),
                logs.getTotalPages());
    }

    @GetMapping("/audit-actions")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<String> getActions() {
        return auditLogRepository.findDistinctActions().stream()
                .map(Enum::name)
                .collect(Collectors.toList());
    }
}
