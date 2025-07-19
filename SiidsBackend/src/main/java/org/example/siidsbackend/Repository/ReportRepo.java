package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReportRepo extends JpaRepository<Report, Integer> {


    List<Report> findByCreatedByOrderByCreatedAtDesc(Employee employee);

    @Query("SELECT e FROM Employee e " +
            "INNER JOIN Placements p ON p.employee.employeeId = e.employeeId " +
            "INNER JOIN JobMaster j ON j.jobMasterId = p.jobMaster.jobMasterId " +
            "INNER JOIN structures s ON s.structureId = j.structureId " +
            "WHERE j.gradeId.gradeId = 5 AND s.structureId = 159")
    List<Employee> DirectorsOfIntelligence();

    @Query("SELECT e FROM Employee e " +
            "INNER JOIN Placements p ON p.employee.employeeId = e.employeeId " +
            "INNER JOIN JobMaster j ON j.jobMasterId = p.jobMaster.jobMasterId " +
            "INNER JOIN structures s ON s.structureId = j.structureId " +
            "WHERE j.gradeId.gradeId = 5 AND s.structureId = 161")
    List<Employee> DirectorsOfInvestigation();

    @Query("SELECT e FROM Employee e " +
            "INNER JOIN Placements p ON p.employee.employeeId = e.employeeId " +
            "INNER JOIN JobMaster j ON j.jobMasterId = p.jobMaster.jobMasterId " +
            "INNER JOIN structures s ON s.structureId = j.structureId " +
            "WHERE j.gradeId.gradeId = 4 AND s.structureId = 10")
    List<Employee> assistantCommissioner();

    @Query("SELECT r FROM Report r JOIN r.relatedCase c " +
            "WHERE c.status = org.example.siidsbackend.Model.WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE " +
            "AND r.currentRecipient.employeeId = :directorId")
    List<Report> findReportsSubmittedToDirectorIntelligence(@Param("directorId") String directorId);


    @Query("SELECT c FROM Case c WHERE c.caseNum = :caseId")
    Optional<Case> findRelatedCaseById(@Param("caseId") Integer caseId);

    List<Report> findByRelatedCaseStatus(WorkflowStatus workflowStatus);

    @Query("SELECT e FROM Employee e " +
            "INNER JOIN Placements p ON p.employee.employeeId = e.employeeId " +
            "INNER JOIN JobMaster j ON j.jobMasterId = p.jobMaster.jobMasterId " +
            "INNER JOIN structures s ON s.structureId = j.structureId " +
            "INNER JOIN Grade g ON g.gradeId = j.gradeId.gradeId " +
            "WHERE j.gradeId.gradeId = 10 " +
            "AND s.structureId = 165")
    List<Employee> findAvailableT3Officers();

    @Query("SELECT COUNT(r) FROM Report r JOIN r.relatedCase c " +
            "WHERE r.currentRecipient.employeeId = :officerId " +
            "AND c.status IN (org.example.siidsbackend.Model.WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER, " +
            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_IN_PROGRESS)")
    int countActiveReportsByOfficer(@Param("officerId") String officerId);

    @Query("SELECT r FROM Report r JOIN r.relatedCase c " +
            "WHERE r.currentRecipient.employeeId = :officerId " +
            "AND c.status = org.example.siidsbackend.Model.WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER " +
            "ORDER BY r.createdAt DESC")
    List<Report> findReportsAssignedToInvestigationOfficer(@Param("officerId") String officerId);

    @Query("SELECT r FROM Report r " +
            "WHERE r.relatedCase.status IN " +
            "(org.example.siidsbackend.Model.WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER, " +
            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION, " +
            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER, " +
            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED) " +
            "ORDER BY r.updatedAt DESC")
    List<Report> findReportsHandledByDirectorInvestigation();
}