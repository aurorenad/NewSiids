package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.TaxPayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TaxPayerRepository extends JpaRepository<TaxPayer, String> {
    Optional<TaxPayer> findByTaxPayerTIN(String taxPayerTIN);
}
