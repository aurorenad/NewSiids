package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.Model.structures;
import org.example.siidsbackend.Service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentsController {

    private final ReportService reportService;

    @GetMapping
    @PreAuthorize("hasAuthority('DEPARTMENT_VIEW')")
    public ResponseEntity<List<structures>> getDepartments() {
        return ResponseEntity.ok(reportService.getAllDepartments());
    }
}
