package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepo extends JpaRepository<Report, Integer> {
    List<Report> findByCurrentRecipientEmployeeId(String employeeId);

    List<Report> findByCreatedByOrderByCreatedAtDesc(Employee employee);
}
