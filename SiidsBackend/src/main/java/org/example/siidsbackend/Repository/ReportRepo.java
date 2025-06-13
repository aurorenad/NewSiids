package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
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
}