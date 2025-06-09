package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Case;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaseRepo extends JpaRepository<Case, Integer> {
    @Override
    Optional<Case> findById(Integer caseNum);
    @Query("""
    SELECT c FROM Case c
    WHERE c.createdBy.employeeId = :employeeId
""")
    List<Case> findByCreatedBy_EmployeeId(@Param("employeeId") String employeeId);
    @Query("""
    SELECT c FROM Case c 
    WHERE :employeeId IN (
        SELECT e.employeeId FROM Employee e
        WHERE e.employeeId = :employeeId
        AND e.currentJob.jobMasterId = 159
        AND e.currentJob.gradeId.gradeName <> 'Assistant_commissioner'
    )
""")
    List<Case> findCasesAllowedForEmployee(@Param("employeeId") String employeeId);
    @Query("SELECT c FROM Case c WHERE c.createdBy.employeeId = :employeeId")
    List<Case> findAllByCreator(@Param("employeeId") String employeeId);
    Optional<Case> findByCaseNumAndCreatedBy_EmployeeId(Integer caseNum, String employeeId);

}
