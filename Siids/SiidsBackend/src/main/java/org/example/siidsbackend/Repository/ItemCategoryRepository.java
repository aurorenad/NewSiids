package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.ItemCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ItemCategoryRepository extends JpaRepository<ItemCategory, Integer> {
    Optional<ItemCategory> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
