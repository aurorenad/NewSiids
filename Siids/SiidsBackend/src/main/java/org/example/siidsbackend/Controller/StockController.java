package org.example.siidsbackend.Controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.StockRequestDTO;
import org.example.siidsbackend.DTO.Response.StockResponseDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Service.FileStorageService;
import org.example.siidsbackend.Service.ItemCategoryService;
import org.example.siidsbackend.Service.StockService;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stock")
@Slf4j
public class StockController {

    private final StockService stockService;
    private final ItemCategoryService itemCategoryService;
    private final FileStorageService fileStorageService;
    private final org.example.siidsbackend.Repository.SeizureReasonRepository seizureReasonRepository;
    private final ObjectMapper objectMapper;

    public StockController(StockService stockService, ItemCategoryService itemCategoryService, FileStorageService fileStorageService, org.example.siidsbackend.Repository.SeizureReasonRepository seizureReasonRepository, ObjectMapper objectMapper) {
        this.stockService = stockService;
        this.itemCategoryService = itemCategoryService;
        this.fileStorageService = fileStorageService;
        this.seizureReasonRepository = seizureReasonRepository;
        this.objectMapper = objectMapper;
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    // --- Enum endpoints for frontend comboboxes ---

    @GetMapping("/item-types")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<List<String>> getItemTypes() {
        return ResponseEntity.ok(itemCategoryService.getAllCategoryNames());
    }

    @GetMapping("/seizure-reasons")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<List<String>> getSeizureReasons() {
        List<String> reasons = seizureReasonRepository.findAll().stream()
                .map(SeizureReason::getReason)
                .collect(Collectors.toList());
        // Ensure "Smuggling" is always an option if the list is empty or doesn't have it
        if (!reasons.contains("SMUGGLING")) {
            reasons.add(0, "SMUGGLING");
        }
        return ResponseEntity.ok(reasons);
    }

    @DeleteMapping("/{id}/document/{index}")
    @PreAuthorize("hasAuthority('STOCK_MANAGE')")
    public ResponseEntity<Void> removeDocument(@PathVariable Integer id, @PathVariable int index) {
        stockService.removeDocument(id, index);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/measurement-units")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<List<String>> getMeasurementUnits() {
        List<String> units = Arrays.stream(MeasurementUnit.values())
                .map(Enum::name)
                .collect(Collectors.toList());
        return ResponseEntity.ok(units);
    }

    @GetMapping("/release-reasons")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<List<String>> getReleaseReasons() {
        List<String> reasons = Arrays.stream(ReleaseReason.values())
                .map(Enum::name)
                .collect(Collectors.toList());
        return ResponseEntity.ok(reasons);
    }

    // --- CRUD endpoints ---

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('STOCK_MANAGE')")
    public ResponseEntity<?> createStock(
            @RequestPart("stockData") StockRequestDTO dto,
            @RequestPart(value = "documents", required = false) List<MultipartFile> documents,
            @RequestPart(value = "anotherDocument", required = false) MultipartFile anotherDocument,
            @RequestPart(value = "paymentProof", required = false) MultipartFile paymentProof) {
        try {
            Stock stock = stockService.createStock(dto, documents, anotherDocument, paymentProof);
            return ResponseEntity.ok(stockService.toDTO(stock));
        } catch (IllegalArgumentException e) {
            log.warn("Validation error creating stock: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Error creating stock: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Error creating stock: " + e.getMessage());
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('STOCK_MANAGE')")
    public ResponseEntity<?> updateStock(
            @PathVariable Integer id,
            @RequestPart("stockData") StockRequestDTO dto,
            @RequestPart(value = "documents", required = false) List<MultipartFile> documents,
            @RequestPart(value = "anotherDocument", required = false) MultipartFile anotherDocument,
            @RequestPart(value = "paymentProof", required = false) MultipartFile paymentProof) {
        try {
            Stock stock = stockService.updateStock(id, dto, documents, anotherDocument, paymentProof);
            return ResponseEntity.ok(stockService.toDTO(stock));
        } catch (IllegalArgumentException e) {
            log.warn("Validation error updating stock: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Error updating stock: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Error updating stock: " + e.getMessage());
        }
    }

    @PutMapping(value = "/{id}/release/{releaseIndex}/status")
    @PreAuthorize("hasAuthority('STOCK_APPROVE_RELEASE')")
    public ResponseEntity<?> updateReleaseStatus(
            @PathVariable Integer id,
            @PathVariable int releaseIndex,
            @RequestBody java.util.Map<String, String> request) {
        try {
            String status = request.get("status");
            String rejectionReason = request.get("rejectionReason");
            String prsoApprovedBy = request.get("prsoApprovedBy");
            Stock stock = stockService.updateReleaseStatus(id, releaseIndex, status, rejectionReason, prsoApprovedBy);
            return ResponseEntity.ok(stockService.toDTO(stock));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error updating status: " + e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('STOCK_MANAGE')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStock(@PathVariable Integer id) {
        stockService.deleteStock(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<List<StockResponseDTO>> getAllStock() {
        List<Stock> stocks = stockService.getAllStock();
        return ResponseEntity.ok(stocks.stream().map(stockService::toDTO).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public ResponseEntity<StockResponseDTO> getStock(@PathVariable Integer id) {
        Stock stock = stockService.getStock(id);
        return ResponseEntity.ok(stockService.toDTO(stock));
    }

    @GetMapping("/{id}/documents")
    @PreAuthorize("hasAnyAuthority('STOCK_MANAGE', 'STOCK_APPROVE_RELEASE')")
    public ResponseEntity<List<String>> getStockDocuments(@PathVariable Integer id) {
        Stock stock = stockService.getStock(id);
        return ResponseEntity.ok(stock.getDocumentPaths());
    }

    @GetMapping("/{id}/document/{index}")
    @PreAuthorize("hasAnyAuthority('STOCK_MANAGE', 'STOCK_APPROVE_RELEASE')")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Integer id, @PathVariable Integer index) throws IOException {
        Stock stock = stockService.getStock(id);
        List<String> paths = stock.getDocumentPaths();
        if (index < 0 || index >= paths.size()) {
            return ResponseEntity.notFound().build();
        }
        return downloadFile(paths.get(index));
    }

    @GetMapping("/{id}/another-document")
    @PreAuthorize("hasAnyAuthority('STOCK_MANAGE', 'STOCK_APPROVE_RELEASE')")
    public ResponseEntity<Resource> downloadAnotherDocument(@PathVariable Integer id) throws IOException {
        Stock stock = stockService.getStock(id);
        String path = stock.getAnotherDocumentPath();
        return downloadFile(path);
    }

    @GetMapping("/{id}/payment-proof/{releaseIndex}")
    @PreAuthorize("hasAnyAuthority('STOCK_MANAGE', 'STOCK_APPROVE_RELEASE')")
    public ResponseEntity<Resource> downloadPaymentProof(@PathVariable Integer id, @PathVariable Integer releaseIndex) throws IOException {
        Stock stock = stockService.getStock(id);
        if (stock.getReleases() == null || releaseIndex < 0 || releaseIndex >= stock.getReleases().size()) {
            return ResponseEntity.notFound().build();
        }
        String path = stock.getReleases().get(releaseIndex).getPaymentProofPath();
        if (path == null) {
            return ResponseEntity.notFound().build();
        }
        return downloadFile(path);
    }

    @GetMapping("/{id}/release-document")
    @PreAuthorize("hasAnyAuthority('STOCK_MANAGE', 'STOCK_APPROVE_RELEASE')")
    public ResponseEntity<?> downloadGeneratedReleaseDocument(@PathVariable Integer id) {
        try {
            Stock stock = stockService.getStock(id);
            if (stock.getDateReleased() == null && (stock.getReleases() == null || stock.getReleases().isEmpty())) {
                return ResponseEntity.badRequest().body("Stock has not been released yet.");
            }
            byte[] pdfContent = stockService.generateReleasePdf(stock);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ReleaseNote-" + stock.getSeizureNumber().replace("/", "-") + ".pdf\"")
                    .body(pdfContent);
        } catch (Exception e) {
            log.error("Error generating release document for stock {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error generating release document: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/release-document/{releaseIndex}")
    @PreAuthorize("hasAnyAuthority('STOCK_MANAGE', 'STOCK_APPROVE_RELEASE')")
    public ResponseEntity<?> downloadGeneratedReleaseDocumentByIndex(@PathVariable Integer id, @PathVariable int releaseIndex) {
        try {
            Stock stock = stockService.getStock(id);
            if (stock.getReleases() == null || releaseIndex < 0 || releaseIndex >= stock.getReleases().size()) {
                return ResponseEntity.badRequest().body("Invalid release index.");
            }
            byte[] pdfContent = stockService.generateReleasePdf(stock, releaseIndex);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ReleaseNote-" + stock.getSeizureNumber().replace("/", "-") + "-Release" + (releaseIndex + 1) + ".pdf\"")
                    .body(pdfContent);
        } catch (Exception e) {
            log.error("Error generating specific release document for stock {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error generating release document: " + e.getMessage());
        }
    }

    private ResponseEntity<Resource> downloadFile(String relativePath) throws IOException {
        if (relativePath == null)
            return ResponseEntity.notFound().build();

        Path filePath = fileStorageService.resolveStoredPath(relativePath);
        Resource resource = new UrlResource(filePath.toUri());

        if (resource.exists() && resource.isReadable()) {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileStorageService.extractDownloadFilename(relativePath) + "\"")
                    .body(resource);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
