package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Report;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepo extends JpaRepository<Report, Integer> {

}
