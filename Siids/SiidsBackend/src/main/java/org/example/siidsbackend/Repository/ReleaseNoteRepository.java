package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.PVDocument;
import org.example.siidsbackend.Model.ReleaseNote;
import org.example.siidsbackend.Model.SeizureNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReleaseNoteRepository extends JpaRepository<ReleaseNote, Integer> {
    List<ReleaseNote> findByPvDocument(PVDocument pv);
    List<ReleaseNote> findBySeizureNote(SeizureNote note);
    List<ReleaseNote> findByStatus(String status);
    List<ReleaseNote> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
}
