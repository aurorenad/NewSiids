package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.ReportAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReportAttachmentRepo extends JpaRepository<ReportAttachment, Integer> {
    Optional<ReportAttachment> findByStoredPath(String storedPath);
}
