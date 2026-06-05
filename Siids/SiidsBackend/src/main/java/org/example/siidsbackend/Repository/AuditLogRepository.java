package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.AuditLog;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByAction(WorkflowStatus action, Pageable pageable);

    @Query("select distinct a.action from AuditLog a where a.action is not null order by a.action")
    List<WorkflowStatus> findDistinctActions();
}
