package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StockRepository extends JpaRepository<Stock, Integer> {
    boolean existsBySeizureNumber(String seizureNumber);

    boolean existsByPvNumber(String pvNumber);

    boolean existsBySeizureNumberAndIdNot(String seizureNumber, Integer id);

    boolean existsByPvNumberAndIdNot(String pvNumber, Integer id);
}
