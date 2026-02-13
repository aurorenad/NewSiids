package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.Model.AuditLog;
import org.example.siidsbackend.Repository.AuditLogRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/audit")
public class AuditController {
    private final AuditLogRepository auditLogRepository;
    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ROLE_AUDITOR')")
    public List<AuditLog> getLogs() {
        return auditLogRepository.findAll();
    }
}
