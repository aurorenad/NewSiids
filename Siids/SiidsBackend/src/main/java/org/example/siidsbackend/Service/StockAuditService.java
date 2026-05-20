package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.StockAuditLog;
import org.example.siidsbackend.Repository.StockAuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StockAuditService {

    private final StockAuditLogRepository auditLogRepository;

    public StockAuditService(StockAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void logAction(String referenceId, String actionType, String details, Employee actor) {
        logActionWithToken(referenceId, actionType, details, actor, null);
    }

    public void logActionWithToken(String referenceId, String actionType, String details, Employee actor, String linkedToken) {
        StockAuditLog log = new StockAuditLog();
        log.setReferenceId(referenceId);
        log.setActionType(actionType);
        log.setDetails(details);
        log.setActor(actor);
        log.setLinkedToken(linkedToken);
        auditLogRepository.save(log);
    }

    public List<StockAuditLog> getLogsForReference(String referenceId) {
        return auditLogRepository.findByReferenceIdOrderByTimestampDesc(referenceId);
    }
}
