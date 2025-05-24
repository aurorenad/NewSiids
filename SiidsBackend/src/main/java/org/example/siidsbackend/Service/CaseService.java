package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Repository.CaseRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CaseService {
    @Autowired
    CaseRepo caseRepo;

    public Case createCase(Case newCase) {
        return caseRepo.save(newCase);
    }

    public List<Case> getAllCases() {
        return caseRepo.findAll();
    }
}
