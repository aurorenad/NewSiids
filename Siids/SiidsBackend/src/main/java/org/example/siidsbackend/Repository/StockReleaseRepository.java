package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.StockRelease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockReleaseRepository extends JpaRepository<StockRelease, Integer> {
    List<StockRelease> findByStockId(Integer stockId);
}
