package org.example.siidsbackend.Controller;

import org.example.siidsbackend.Model.TaxPayer;
import org.example.siidsbackend.Service.TaxPayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/taxpayers")
public class TaxPayerController {

    @Autowired
    private TaxPayerService taxPayerService;

    @PostMapping
    public ResponseEntity<TaxPayer> createTaxPayer(@RequestBody TaxPayer taxPayer) {
        TaxPayer saved = taxPayerService.addTaxPayer(taxPayer);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/tin/{tin}")
    public ResponseEntity<TaxPayer> getByTIN(@PathVariable String tin) {
        return taxPayerService.findByTIN(tin)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public List<TaxPayer> getAllTaxPayers() {
        return taxPayerService.getAllTaxPayers();
    }
}
