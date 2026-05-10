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
    
    java.util.List<Stock> findByStatus(String status);
    
    @org.springframework.data.jpa.repository.Query("SELECT s FROM Stock s WHERE s.status IS NULL OR s.status = '' OR s.status = :status")
    java.util.List<Stock> findByStatusIsNullOrStatus(@org.springframework.data.repository.query.Param("status") String status);
}
