package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class employeeService {
    @Autowired
    EmployeeRepo employeeRepo;

    public Optional<Employee> findById(String EmployeeId) {
        return employeeRepo.findByEmployeeId(EmployeeId);
    }
}
