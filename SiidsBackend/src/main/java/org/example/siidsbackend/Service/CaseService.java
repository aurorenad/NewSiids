package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Case;
import org.example.siidsbackend.Repository.CaseRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CaseService {

    @Autowired
    private CaseRepo caseRepo;

    public Case createCase(Case newCase) {
                return caseRepo.save(newCase);
    }

    public Case updateCase(Integer caseNum, Case updatedCase) {
        return caseRepo.findById(caseNum)
                .map(existingCase -> {
                    if (updatedCase.getCaseNum() != null) {
                        existingCase.setCaseNum(updatedCase.getCaseNum());
                    }
                    if (updatedCase.getTaxPayerName() != null) {
                        existingCase.setTaxPayerName(updatedCase.getTaxPayerName());
                    }
//                    if (updatedCase.get() != null) {
//                        existingCase.setReportingOfficer(updatedCase.getReportingOfficer());
//                    }
                    // Update other fields as needed
                    return caseRepo.save(existingCase);
                })
                .orElseThrow(() -> new RuntimeException("Case not found with id: " + caseNum));
    }

    public List<Case> getAllCases() {
        return caseRepo.findAll();
    }

    public Optional<Case> getCaseById(Integer caseNum) {
        return caseRepo.findById(caseNum);
    }


}