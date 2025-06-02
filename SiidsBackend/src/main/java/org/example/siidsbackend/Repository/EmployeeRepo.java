package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmployeeRepo  extends JpaRepository<Employee, String> {
    @Query("SELECT e FROM Employee e WHERE e.employeeId = :employeeId")
    Optional<Employee> findByEmployeeId(@Param("employeeId") String employeeId);

}
