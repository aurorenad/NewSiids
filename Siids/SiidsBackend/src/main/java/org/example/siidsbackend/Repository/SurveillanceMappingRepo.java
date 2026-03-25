package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.SurveillanceMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SurveillanceMappingRepo extends JpaRepository<SurveillanceMapping, Integer> {
}
