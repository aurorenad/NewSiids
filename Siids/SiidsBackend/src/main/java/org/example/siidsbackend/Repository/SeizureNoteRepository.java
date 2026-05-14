package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.SeizureNote;
import org.example.siidsbackend.Model.PhysicalStockStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeizureNoteRepository extends JpaRepository<SeizureNote, Integer> {
    List<SeizureNote> findByStatus(PhysicalStockStatus status);
    List<SeizureNote> findByPvInChargeOrderByCreatedAtDesc(Employee officer);
}
