package org.example.siidsbackend.Controller;

import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Service.CaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/Case")
public class CaseController {
    @Autowired
    private CaseService caseService;

    @PostMapping("/New")
    public Case createCase(@RequestBody Case newCase) {
        return caseService.createCase(newCase);
    }

    @GetMapping("all")
    public List<Case> getAllCases() {
        return caseService.getAllCases();
    }
}
