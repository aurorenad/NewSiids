package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.StockItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StockItemRepository extends JpaRepository<StockItem, Integer> {
}
