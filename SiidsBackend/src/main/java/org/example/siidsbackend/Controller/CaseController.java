package org.example.siidsbackend.Controller;

import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Service.CaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;


@RestController
@RequestMapping("/api/cases")
public class CaseController {

    @Autowired
    private CaseService caseService;

    @PostMapping
    @PreAuthorize("hasAuthority('User')")
    public ResponseEntity<Case> createCase(@RequestBody Case newCase) {
        try {
            Case createdCase = caseService.createCase(newCase);
            return ResponseEntity.ok(createdCase);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('IntelligenceOfficer')")
    public ResponseEntity<Case> updateCase(@PathVariable Integer caseNum, @RequestBody Case updatedCase) {
        try {
            Case result = caseService.updateCase(caseNum, updatedCase);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping
    public ResponseEntity<List<Case>> getAllCases() {
        return ResponseEntity.ok(caseService.getAllCases());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Case> getCaseById(@PathVariable Integer caseNum) {
        return caseService.getCaseById(caseNum)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}