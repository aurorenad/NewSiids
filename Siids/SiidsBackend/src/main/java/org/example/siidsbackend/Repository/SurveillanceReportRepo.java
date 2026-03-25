package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.SurveillanceReport;
import org.example.siidsbackend.Model.WorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SurveillanceReportRepo extends JpaRepository<SurveillanceReport, Integer> {
    List<SurveillanceReport> findByStatus(WorkflowStatus status);
}
