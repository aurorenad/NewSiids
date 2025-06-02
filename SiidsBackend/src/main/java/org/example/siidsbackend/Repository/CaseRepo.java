package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Case;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CaseRepo extends JpaRepository<Case, Integer> {
    @Override
    Optional<Case> findById(Integer caseNum);
}
