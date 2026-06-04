package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.ReportRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRevisionRepo extends JpaRepository<ReportRevision, Integer> {
    List<ReportRevision> findByReportIdOrderByRevisedAtDesc(Integer reportId);
}
