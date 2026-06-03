package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.Model.TaxPayer;
import org.example.siidsbackend.Service.TaxPayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/taxpayers")
@RequiredArgsConstructor
public class TaxPayerController {

    private final TaxPayerService taxPayerService;

    @PostMapping
    @PreAuthorize("hasAuthority('TAXPAYER_MANAGE')")
    public ResponseEntity<TaxPayer> createTaxPayer(@RequestBody TaxPayer taxPayer) {
        TaxPayer saved = taxPayerService.addTaxPayer(taxPayer);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/tin/{tin}")
    @PreAuthorize("hasAuthority('TAXPAYER_VIEW')")
    public ResponseEntity<TaxPayer> getByTIN(@PathVariable String tin) {
        return taxPayerService.findByTIN(tin)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('TAXPAYER_VIEW')")
    public List<TaxPayer> getAllTaxPayers() {
        return taxPayerService.getAllTaxPayers();
    }
}
