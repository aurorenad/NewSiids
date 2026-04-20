package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.SeizureReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SeizureReasonRepository extends JpaRepository<SeizureReason, Integer> {
    Optional<SeizureReason> findByReason(String reason);
}
