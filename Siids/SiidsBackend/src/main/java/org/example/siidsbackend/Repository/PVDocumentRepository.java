package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.PVDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PVDocumentRepository extends JpaRepository<PVDocument, Integer> {
}
