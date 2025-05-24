package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmployeeRepo  extends JpaRepository<Employee, String> {
    Optional<Employee> findByEmployeeId(String employeeId);
}
