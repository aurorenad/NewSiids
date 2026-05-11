package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.StockAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockAuditLogRepository extends JpaRepository<StockAuditLog, Integer> {
    List<StockAuditLog> findByReferenceIdOrderByTimestampDesc(String referenceId);
}
