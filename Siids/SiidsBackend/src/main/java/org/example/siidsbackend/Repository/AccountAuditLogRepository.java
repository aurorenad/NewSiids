package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.AccountAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountAuditLogRepository extends JpaRepository<AccountAuditLog, Long> {
    List<AccountAuditLog> findAllByOrderByPerformedAtDesc();
    List<AccountAuditLog> findByTargetUsernameOrderByPerformedAtDesc(String targetUsername);
}
