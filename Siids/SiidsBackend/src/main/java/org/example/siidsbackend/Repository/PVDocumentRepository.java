package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.PVDocument;
import org.example.siidsbackend.Model.SeizureNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PVDocumentRepository extends JpaRepository<PVDocument, Integer> {
    Optional<PVDocument> findBySeizureNote(SeizureNote seizureNote);
}
