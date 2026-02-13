package org.example.siidsbackend.Controller;

import org.example.siidsbackend.Model.structures;
import org.example.siidsbackend.Service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentsController {

    @Autowired
    private ReportService reportService;
    @GetMapping
    public ResponseEntity<List<structures>> getDepartments() {
        return ResponseEntity.ok(reportService.getAllDepartments());
    }
}
