package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaseRepo extends JpaRepository<Case, Integer> {
    Optional<Case> findById(Integer id);

    Optional<Case> findByCaseNum(String caseNum);

    @Query("SELECT c FROM Case c WHERE c.createdBy.employeeId = :employeeId")
    List<Case> findByCreatedBy_EmployeeId(@Param("employeeId") String employeeId);

    @Query("SELECT c FROM Case c WHERE c.caseNum = :caseNum AND c.createdBy.employeeId = :employeeId")
    Optional<Case> findByCaseNumAndCreatedBy_EmployeeId(
            @Param("caseNum") String caseNum,
            @Param("employeeId") String employeeId);

    @Query("SELECT COUNT(c) FROM Case c WHERE c.caseNum LIKE :prefix%")
    long countByCaseNumStartingWith(@Param("prefix") String prefix);


    @Query("SELECT c FROM Case c WHERE c.status = :status AND c.createdBy.employeeId = :employeeId")
    List<Case> findByStatusAndCreatedBy_EmployeeId(
            @Param("status") WorkflowStatus status,
            @Param("employeeId") String employeeId);


}