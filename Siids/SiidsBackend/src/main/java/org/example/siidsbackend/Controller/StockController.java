package org.example.siidsbackend.Controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.StockRequestDTO;
import org.example.siidsbackend.DTO.Response.StockResponseDTO;
import org.example.siidsbackend.Model.Item;
import org.example.siidsbackend.Model.MeasurementUnit;
import org.example.siidsbackend.Model.Stock;
import org.example.siidsbackend.Service.StockService;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
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
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stock")
@Slf4j
public class StockController {

    private final StockService stockService;
    private final ObjectMapper objectMapper;

    public StockController(StockService stockService, ObjectMapper objectMapper) {
        this.stockService = stockService;
        this.objectMapper = objectMapper;
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Value("${file.upload-dir}")
    private String uploadDir;

    // --- Enum endpoints for frontend comboboxes ---

    @GetMapping("/item-types")
    public ResponseEntity<List<String>> getItemTypes() {
        List<String> types = Arrays.stream(Item.values())
                .map(Enum::name)
                .collect(Collectors.toList());
        return ResponseEntity.ok(types);
    }

    @GetMapping("/measurement-units")
    public ResponseEntity<List<String>> getMeasurementUnits() {
        List<String> units = Arrays.stream(MeasurementUnit.values())
                .map(Enum::name)
                .collect(Collectors.toList());
        return ResponseEntity.ok(units);
    }

    // --- CRUD endpoints ---

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('Admin', 'StockManager')")
    public ResponseEntity<?> createStock(
            @RequestPart("stockData") StockRequestDTO dto,
            @RequestPart(value = "document", required = false) MultipartFile document,
            @RequestPart(value = "anotherDocument", required = false) MultipartFile anotherDocument) {
        try {
            Stock stock = stockService.createStock(dto, document, anotherDocument);
            return ResponseEntity.ok(stockService.toDTO(stock));
        } catch (Exception e) {
            log.error("Error creating stock: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Error creating stock: " + e.getMessage());
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('Admin', 'StockManager')")
    public ResponseEntity<?> updateStock(
            @PathVariable Integer id,
            @RequestPart("stockData") StockRequestDTO dto,
            @RequestPart(value = "document", required = false) MultipartFile document,
            @RequestPart(value = "anotherDocument", required = false) MultipartFile anotherDocument) {
        try {
            Stock stock = stockService.updateStock(id, dto, document, anotherDocument);
            return ResponseEntity.ok(stockService.toDTO(stock));
        } catch (Exception e) {
            log.error("Error updating stock: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Error updating stock: " + e.getMessage());
        }
    }

    @PreAuthorize("hasAnyAuthority('Admin', 'StockManager')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStock(@PathVariable Integer id) {
        stockService.deleteStock(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<StockResponseDTO>> getAllStock() {
        List<Stock> stocks = stockService.getAllStock();
        return ResponseEntity.ok(stocks.stream().map(stockService::toDTO).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StockResponseDTO> getStock(@PathVariable Integer id) {
        Stock stock = stockService.getStock(id);
        return ResponseEntity.ok(stockService.toDTO(stock));
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Integer id) throws IOException {
        Stock stock = stockService.getStock(id);
        String path = stock.getDocumentPath();
        return downloadFile(path);
    }

    @GetMapping("/{id}/another-document")
    public ResponseEntity<Resource> downloadAnotherDocument(@PathVariable Integer id) throws IOException {
        Stock stock = stockService.getStock(id);
        String path = stock.getAnotherDocumentPath();
        return downloadFile(path);
    }

    private ResponseEntity<Resource> downloadFile(String relativePath) throws IOException {
        if (relativePath == null)
            return ResponseEntity.notFound().build();

        Path filePath = Paths.get(uploadDir).resolve(relativePath).normalize();
        Resource resource = new UrlResource(filePath.toUri());

        if (resource.exists() && resource.isReadable()) {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
