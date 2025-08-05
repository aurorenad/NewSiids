package org.example.siidsbackend.Repository;

import org.example.siidsbackend.DTO.DirectorIntelligenceReportDTO;
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

//    @Query("SELECT r FROM Report r " +
//            "WHERE r.relatedCase.status IN " +
//            "(org.example.siidsbackend.Model.WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER, " +
//            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION, " +
//            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER, " +
//            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED) " +
//            "ORDER BY r.updatedAt DESC")
//    List<Report> findReportsHandledByDirectorInvestigation();


    List<Report> findByRelatedCase(Case relatedCase);

    @Query(value = "SELECT r.* FROM Report r WHERE\n" +
            "       r.current_recipient IN (SELECT\n" +
            "                                   e.employee_id\n" +
            "                               FROM\n" +
            "                                   employees e\n" +
            "                                       INNER JOIN\n" +
            "                                   placements p ON p.employee_id = e.employee_id\n" +
            "                                       INNER JOIN\n" +
            "                                   job_master j ON j.job_master_id = p.job_master_id\n" +
            "                                       INNER JOIN\n" +
            "                                   structures s ON s.structure_id = j.structure_id\n" +
            "                                       INNER JOIN\n" +
            "                                   grades g on j.grade_id = g.grade_id\n" +
            "                               WHERE\n" +
            "                                   j.job_master_id = 119\n" +
            "                                 and j.grade_id = 5)\n" +
            "       OR r.director_intelligence_id IS NOT NULL \n" +
            "       OR r.case_num IN ('REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE', 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE', 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE')\n" +
            "       ORDER BY r.updated_at DESC", nativeQuery = true)
    List<Report> findReportsHandledByDirectorIntelligence();

    @Query(value = "SELECT r.* FROM Report r WHERE\n" +
            "       r.current_recipient IN (SELECT\n" +
            "                                   e.employee_id\n" +
            "                               FROM\n" +
            "                                   employees e\n" +
            "                                       INNER JOIN\n" +
            "                                   placements p ON p.employee_id = e.employee_id\n" +
            "                                       INNER JOIN\n" +
            "                                   job_master j ON j.job_master_id = p.job_master_id\n" +
            "                                       INNER JOIN\n" +
            "                                   structures s ON s.structure_id = j.structure_id\n" +
            "                                       INNER JOIN\n" +
            "                                   grades g on j.grade_id = g.grade_id\n" +
            "                               WHERE\n" +
            "                                   j.job_master_id = 116\n" +
            "                                 and j.grade_id = 4)\n" +
            "       OR r.assistant_commissioner_id IS NOT NULL\n" +
            "       OR r.case_num IN ('REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE', 'REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER')\n" +
            "       ORDER BY r.updated_at DESC;", nativeQuery = true)
    List<Report> findReportsHandledAssistantCommissioner();

    @Query("SELECT r FROM Report r JOIN r.relatedCase c " +
            "WHERE (r.currentRecipient.employeeId IN " +
            "(SELECT e.employeeId FROM Employee e " +
            "INNER JOIN Placements p ON p.employee.employeeId = e.employeeId " +
            "INNER JOIN JobMaster j ON j.jobMasterId = p.jobMaster.jobMasterId " +
            "INNER JOIN structures s ON s.structureId = j.structureId " +
            "WHERE j.gradeId.gradeId = 5 AND s.structureId = 161) " +
            "OR (c.status = org.example.siidsbackend.Model.WorkflowStatus.REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER) " +
            "OR (c.status = org.example.siidsbackend.Model.WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER) " +
            "OR (c.status = org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED)) " +
            "ORDER BY r.updatedAt DESC")
    List<Report> findReportsHandledByDirectorInvestigation();

    boolean existsByRelatedCase_CaseNum(String caseNum);

    Optional<Report> findByRelatedCase_CaseNum(String caseNum);

    // In ReportRepo.java
    @Query("SELECT r FROM Report r WHERE r.principleAmount IS NOT NULL AND r.principleAmount > 0 " +
            "AND r.penaltiesAmount IS NOT NULL AND r.penaltiesAmount > 0 " +
            "AND r.relatedCase.status = org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED")
    List<Report> findReportsWithFines();

    @Query("SELECT r FROM Report r WHERE (r.principleAmount IS NULL OR r.principleAmount = 0) " +
            "AND (r.penaltiesAmount IS NULL OR r.penaltiesAmount = 0) " +
            "AND r.relatedCase.status = org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED")
    List<Report> findReportsWithoutFines();

    @Query("SELECT " +
            "c.caseNum, c.status, r.createdAt, c.taxPeriod " +
            "FROM Report r " +
            "JOIN r.relatedCase c " +
            "WHERE c.status IN (" +
            "org.example.siidsbackend.Model.WorkflowStatus.CASE_CREATED, " +
            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED, " +
            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE) " +
            "ORDER BY r.createdAt DESC")
    List<DirectorIntelligenceReportDTO> findCasesForDirectorIntelligenceReport();

//    @Query(value = "SELECT r.*, c.* FROM siids.report r \n" +
//            "JOIN siids.case c ON c.case_num = r.case_num\n" +
//            "WHERE r.investigation_officer_id = :officerId OR\n" +
//            "r.current_recipient = :officerId\n" +  // Fixed typo in "recipient"?
//            "ORDER BY r.created_at DESC",  // Changed to created_at if it's snake_case in DB
//            nativeQuery = true)
//    List<Report> findReportsAssignedToInvestigationOfficer(@Param("officerId") String officerId);
}