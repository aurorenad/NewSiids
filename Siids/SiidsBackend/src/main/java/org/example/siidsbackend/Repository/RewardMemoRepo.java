package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.RewardMemo;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RewardMemoRepo extends JpaRepository<RewardMemo, Integer> {
    List<RewardMemo> findByCreatedBy_EmployeeId(String employeeId);
    
    List<RewardMemo> findByCurrentRecipient_EmployeeId(String employeeId);
    
    @Query("SELECT r FROM RewardMemo r WHERE r.status = :status")
    List<RewardMemo> findByStatus(@Param("status") WorkflowStatus status);

    @Query("SELECT r FROM RewardMemo r WHERE r.status = :status AND r.currentRecipient.employeeId = :employeeId")
    List<RewardMemo> findByStatusAndRecipient(@Param("status") WorkflowStatus status, @Param("employeeId") String employeeId);
}
