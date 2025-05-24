package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Repository.ReportRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ReportService {
    @Autowired
    ReportRepo reportRepo;

    public Report addReport(Report report) {

        return reportRepo.save(report);
    }

    public Report getReport(int id) {
        return reportRepo.getReferenceById(id);
    }
}
