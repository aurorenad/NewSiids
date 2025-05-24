package org.example.siidsbackend.Controller;

import io.jsonwebtoken.io.IOException;
import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/Report")
public class ReportController {
    @Autowired
    private ReportService reportService;

    @PostMapping("/new")
    public ResponseEntity<Report> addReport(
            @RequestParam("id") int id,
            @RequestParam("description") String description,
            @RequestParam("attachment") MultipartFile attachment) {

        try {
            // Save the file to a location or convert it to Base64, etc.
            String fileName = attachment.getOriginalFilename();
            Path filePath = Paths.get("uploads/" + fileName);
            Files.createDirectories(filePath.getParent());
            Files.write(filePath, attachment.getBytes());

            // Create the Report object
            Report report = new Report();
            report.setId(id);
            report.setDescription(description);
            report.setAttachment(filePath.toString()); // or fileName

            Report savedReport = reportService.addReport(report);
            return ResponseEntity.ok(savedReport);
        } catch (IOException | java.io.IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    @GetMapping("/view")
    public Report viewReport(@RequestParam int id) {
        return reportService.getReport(id);
    }
}
