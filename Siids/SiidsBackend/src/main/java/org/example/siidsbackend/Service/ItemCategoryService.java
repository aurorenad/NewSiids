package org.example.siidsbackend.Service;

import jakarta.annotation.PostConstruct;
import org.example.siidsbackend.Model.Item;
import org.example.siidsbackend.Model.ItemCategory;
import org.example.siidsbackend.Repository.ItemCategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ItemCategoryService {

    private final ItemCategoryRepository repository;

    public ItemCategoryService(ItemCategoryRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    @Transactional
    public void bootstrapCategories() {
        Arrays.stream(Item.values()).forEach(item -> {
            if (!repository.existsByNameIgnoreCase(item.name())) {
                repository.save(new ItemCategory(item.name()));
            }
        });
    }

    public List<String> getAllCategoryNames() {
        return repository.findAll().stream()
                .map(ItemCategory::getName)
                .collect(Collectors.toList());
    }

    @Transactional
    public void ensureCategoryExists(String name) {
        if (name != null && !name.isBlank() && !repository.existsByNameIgnoreCase(name)) {
            repository.save(new ItemCategory(name.toUpperCase()));
        }
    }
}
