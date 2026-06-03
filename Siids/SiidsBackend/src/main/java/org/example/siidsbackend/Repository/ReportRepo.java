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

    @Query("SELECT e FROM Employee e WHERE e.employeeId IN " +
            "(SELECT u.username FROM User u WHERE LOWER(REPLACE(REPLACE(u.role, ' ', ''), '_', '')) = 'directorintelligence' AND (u.active = true OR u.active IS NULL))")
    List<Employee> DirectorsOfIntelligence();

    @Query("SELECT e FROM Employee e WHERE e.employeeId IN " +
            "(SELECT u.username FROM User u WHERE LOWER(REPLACE(REPLACE(u.role, ' ', ''), '_', '')) = 'directorinvestigation' AND (u.active = true OR u.active IS NULL))")
    List<Employee> DirectorsOfInvestigation();

    @Query("SELECT e FROM Employee e WHERE e.employeeId IN " +
            "(SELECT u.username FROM User u WHERE LOWER(REPLACE(REPLACE(u.role, ' ', ''), '_', '')) = 'assistantcommissioner' AND (u.active = true OR u.active IS NULL))")
    List<Employee> assistantCommissioner();

    @Query("SELECT DISTINCT r FROM Report r JOIN r.relatedCase c " +
            "WHERE r.currentRecipient.employeeId = :directorId " +
            "OR r.directorIntelligence.employeeId = :directorId " +
            "OR (c.status IN (" +
            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_SUBMITTED, " +
            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE, " +
            "org.example.siidsbackend.Model.WorkflowStatus.CASE_PLAN_SUBMITTED, " +
            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE" +
            ")) ORDER BY r.updatedAt DESC")
    List<Report> findReportsHandledByDirectorIntelligence(@Param("directorId") String directorId);

    @Query("SELECT c FROM Case c WHERE c.caseNum = :caseId")
    Optional<Case> findRelatedCaseById(@Param("caseId") Integer caseId);

    List<Report> findByRelatedCaseStatus(WorkflowStatus workflowStatus);

    @Query(value = "SELECT * FROM employees WHERE employee_id IN ('04037', '03544')", nativeQuery = true)
    List<Employee> findAvailableT3Officers();

    @Query("SELECT COUNT(r) FROM Report r JOIN r.relatedCase c " +
            "WHERE r.currentRecipient.employeeId = :officerId " +
            "AND c.status IN (org.example.siidsbackend.Model.WorkflowStatus.REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER, " +
            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_IN_PROGRESS)")
    int countActiveReportsByOfficer(@Param("officerId") String officerId);

    @Query(value = "SELECT r.* FROM report r " +
            "JOIN \"case\" c ON c.case_num = r.case_num " +
            "WHERE (LOWER(TRIM(r.investigation_officer_id)) = LOWER(TRIM(:officerId)) OR LOWER(TRIM(r.current_recipient)) = LOWER(TRIM(:officerId))) " +
            "AND c.status IN (:activeStatuses) " +
            "ORDER BY r.created_at DESC", nativeQuery = true)
    List<Report> queryActiveInvestigations(
            @Param("officerId") String officerId,
            @Param("activeStatuses") List<String> activeStatuses);

    @Query(value = "SELECT r.* FROM report r " +
            "WHERE (LOWER(TRIM(r.investigation_officer_id)) = LOWER(TRIM(:officerId)) OR LOWER(TRIM(r.current_recipient)) = LOWER(TRIM(:officerId))) " +
            "ORDER BY r.created_at DESC", nativeQuery = true)
    List<Report> findReportsByInvestigationOfficer(@Param("officerId") String officerId);

    @Query(value = "SELECT r.* FROM report r \n" +
            "       LEFT JOIN \"case\" c ON c.case_num = r.case_num \n" +
            "       WHERE r.current_recipient IN (SELECT\n" +
            "                                   e.employee_id\n" +
            "                               FROM\n" +
            "                                   employees e\n" +
            "                                       INNER JOIN\n" +
            "                                   placements p ON p.employee_id = e.employee_id\n" +
            "                                       INNER JOIN\n" +
            "                                   job_master j ON j.job_master_id = p.job_master_id\n" +
            "                               WHERE\n" +
            "                                   j.job_master_id = 119\n" +
            "                                 and j.grade_id = 5)\n" +
            "       OR r.director_intelligence_id IS NOT NULL \n" +
            "       OR c.status IN ('REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE', 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE', 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE')\n" +
            "       ORDER BY r.updated_at DESC", nativeQuery = true)
    List<Report> findReportsHandledByDirectorIntelligence();

    @Query(value = "SELECT r.* FROM report r \n" +
            "       LEFT JOIN \"case\" c ON c.case_num = r.case_num \n" +
            "       WHERE r.current_recipient IN (SELECT\n" +
            "                                   e.employee_id\n" +
            "                               FROM\n" +
            "                                   employees e\n" +
            "                                       INNER JOIN\n" +
            "                                   placements p ON p.employee_id = e.employee_id\n" +
            "                                       INNER JOIN\n" +
            "                                   job_master j ON j.job_master_id = p.job_master_id\n" +
            "                               WHERE\n" +
            "                                   j.job_master_id = 116\n" +
            "                                 and j.grade_id = 4)\n" +
            "       OR r.assistant_commissioner_id IS NOT NULL\n" +
            "       OR c.status IN ('REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE', 'REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER', 'REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER', \n" +
            "                       'INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION', 'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION', \n" +
            "                       'INVESTIGATION_REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER', 'INVESTIGATION_REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER',\n" +
            "                       'CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER', 'CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER', 'CASE_PLAN_REJECTED_BY_ASSISTANT_COMMISSIONER')\n" +
            "       ORDER BY r.updated_at DESC;", nativeQuery = true)
    List<Report> findReportsHandledAssistantCommissioner();

    @Query("SELECT DISTINCT r FROM Report r JOIN r.relatedCase c " +
            "WHERE r.currentRecipient.employeeId = :directorId " +
            "OR r.directorInvestigation.employeeId = :directorId " +
            "OR (c.status IN (" +
            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION, " +
            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION, " +
            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION, " +
            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED" +
            "))")
    List<Report> findReportsHandledByDirectorInvestigation(@Param("directorId") String directorId);

    @Query("SELECT r FROM Report r WHERE r.principleAmount IS NOT NULL AND r.principleAmount > 0 " +
            "AND r.penaltiesAmount IS NOT NULL AND r.penaltiesAmount > 0 " +
            "AND r.relatedCase.status = org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED")
    List<Report> findReportsWithFines();

    @Query("SELECT r FROM Report r WHERE (r.principleAmount IS NULL OR r.principleAmount = 0) " +
            "AND (r.penaltiesAmount IS NULL OR r.penaltiesAmount = 0) " +
            "AND r.relatedCase.status = org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED")
    List<Report> findReportsWithoutFines();

    @Query("SELECT c.caseNum, c.status, r.createdAt, c.taxPeriod " +
            "FROM Report r JOIN r.relatedCase c " +
            "WHERE c.status IN (" +
            "org.example.siidsbackend.Model.WorkflowStatus.CASE_CREATED, " +
            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_COMPLETED, " +
            "org.example.siidsbackend.Model.WorkflowStatus.INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION, " +
            "org.example.siidsbackend.Model.WorkflowStatus.REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE) " +
            "ORDER BY r.createdAt DESC")
    List<DirectorIntelligenceReportDTO> findCasesForDirectorIntelligenceReport();

    @Query("SELECT e FROM Employee e WHERE e.employeeId IN " +
            "(SELECT u.username FROM User u WHERE u.role IN ('legalAdvisor', 'Legal Advisor', 'LegalAdvisor') AND u.active = true)")
    List<Employee> findLegalAdvisors();

    @Query("SELECT r FROM Report r JOIN r.relatedCase c " +
            "WHERE c.status = org.example.siidsbackend.Model.WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM " +
            "AND r.currentRecipient.employeeId = :legalAdvisorId")
    List<Report> findReportsAssignedToLegalAdvisor(@Param("legalAdvisorId") String legalAdvisorId);

    @Query("SELECT r FROM Report r " +
            "WHERE r.legalAdvisor.employeeId = :legalAdvisorId " +
            "OR (r.currentRecipient.employeeId = :legalAdvisorId " +
            "AND r.relatedCase.status = org.example.siidsbackend.Model.WorkflowStatus.REPORT_SENT_TO_LEGAL_TEAM) " +
            "ORDER BY r.createdAt DESC")
    List<Report> findReportsByLegalAdvisor(@Param("legalAdvisorId") String legalAdvisorId);

    @Query("SELECT r FROM Report r WHERE r.relatedCase.status = :status " +
            "AND r.currentRecipient.employeeId = :directorId")
    List<Report> findCasePlansForDirectorInvestigation(
            @Param("status") WorkflowStatus status,
            @Param("directorId") String directorId);

    @Query("SELECT r FROM Report r WHERE r.relatedCase.status = :status " +
            "AND (r.currentRecipient.employeeId = :employeeId OR r.directorInvestigation IS NOT NULL)")
    List<Report> findCasePlansForAssistantCommissioner(
            @Param("status") WorkflowStatus status,
            @Param("employeeId") String employeeId);

    List<Report> findByRelatedCase(Case relatedCase);
    Optional<Report> findByRelatedCase_CaseNum(String caseNum);
    Optional<Report> findFirstByRelatedCase_CaseNumOrderByCreatedAtDesc(String caseNum);
    boolean existsByRelatedCase_CaseNum(String caseNum);

    @Query("SELECT r FROM Report r WHERE r.legalAdvisor IS NOT NULL OR r.currentRecipient.employeeId IN " +
            "(SELECT u.username FROM User u WHERE u.role IN ('legalAdvisor', 'Legal Advisor', 'LegalAdvisor'))")
    List<Report> findReportsWithLegalAdvisors();
}