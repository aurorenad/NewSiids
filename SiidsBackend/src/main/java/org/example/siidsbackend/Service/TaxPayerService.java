package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.TaxPayer;
import org.example.siidsbackend.Repository.TaxPayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TaxPayerService {
    @Autowired
    private TaxPayerRepository taxPayerRepository;

    public TaxPayer addTaxPayer(TaxPayer taxPayer) {
        return taxPayerRepository.save(taxPayer);
    }

    public Optional<TaxPayer> findByTIN(String taxPayerTIN) {
        return taxPayerRepository.findByTaxPayerTIN(taxPayerTIN);
    }

    public List<TaxPayer> getAllTaxPayers() {
        return taxPayerRepository.findAll();
    }
}
