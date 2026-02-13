package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.Model.AuditLog;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.example.siidsbackend.Repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {
    private final AuditLogRepository auditLogRepository;

    public void logAction(WorkflowStatus action, String description, Employee user) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setDescription(description);
        log.setTimestamp(LocalDateTime.now());
        log.setPerformedBy(user);
        auditLogRepository.save(log);
    }

}
