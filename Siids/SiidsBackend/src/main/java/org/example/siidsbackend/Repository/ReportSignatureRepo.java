package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.ReportSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportSignatureRepo extends JpaRepository<ReportSignature, Integer> {
    List<ReportSignature> findByReportId(Integer reportId);
}
