package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReportRepo extends JpaRepository<Report, Integer> {


    List<Report> findByCreatedByOrderByCreatedAtDesc(Employee employee);

    @Query("SELECT\n" +
            "    e.employeeId,\n" +
            "    e.givenName,\n" +
            "    s.structureId,\n" +
            "    s.structureName\n" +
            "FROM\n" +
            "    Employee e\n" +
            "        INNER JOIN\n" +
            "    Placements p ON p.employee.employeeId = e.employeeId\n" +
            "        INNER JOIN\n" +
            "    JobMaster j ON j.jobMasterId = p.jobMaster.jobMasterId\n" +
            "        INNER JOIN\n" +
            "    structures s ON s.structureId = j.structureId\n" +
            "WHERE\n" +
            "    j.gradeId.gradeId = 5" +
            "  AND\n" +
            "    s.structureId = 159")
    List<Employee> DirectorsOfIntelligence();

    @Query("SELECT\n" +
            "    e.employeeId,\n" +
            "    e.givenName,\n" +
            "    s.structureId,\n" +
            "    s.structureName\n" +
            "FROM\n" +
            "    Employee e\n" +
            "        INNER JOIN\n" +
            "    Placements p ON p.employee.employeeId = e.employeeId\n" +
            "        INNER JOIN\n" +
            "    JobMaster j ON j.jobMasterId = p.jobMaster.jobMasterId\n" +
            "        INNER JOIN\n" +
            "    structures s ON s.structureId = j.structureId\n" +
            "WHERE\n" +
            "    j.gradeId.gradeId = 5" +
            "  AND\n" +
            "    s.structureId = 161")
    List<Employee> DirectorsOfInvestigation();

    @Query("SELECT\n" +
            "    e.employeeId,\n" +
            "    e.givenName,\n" +
            "    s.structureId,\n" +
            "    s.structureName\n" +
            "FROM\n" +
            "    Employee e\n" +
            "        INNER JOIN\n" +
            "    Placements p ON p.employee.employeeId = e.employeeId\n" +
            "        INNER JOIN\n" +
            "    JobMaster j ON j.jobMasterId = p.jobMaster.jobMasterId\n" +
            "        INNER JOIN\n" +
            "    structures s ON s.structureId = j.structureId\n" +
            "WHERE\n" +
            "    j.gradeId.gradeId = 4" +
            "  AND\n" +
            "    s.structureId = 10")
    List<Employee> AsstistantCommissioner();
}
