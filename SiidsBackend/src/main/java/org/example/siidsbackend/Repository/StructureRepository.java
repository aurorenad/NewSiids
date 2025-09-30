package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.structures;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StructureRepository extends JpaRepository<structures, Integer> {
    List<structures> findByStructureType(String structureType);
}
