package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Informer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InformerRepository extends JpaRepository<Informer, String> {
    Optional<Informer> findInformerByNationalId(String nationalId);
}
