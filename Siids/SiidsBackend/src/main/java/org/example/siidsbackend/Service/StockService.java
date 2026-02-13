package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.StockRequestDTO;
import org.example.siidsbackend.DTO.Response.StockResponseDTO;
import org.example.siidsbackend.Model.Item;
import org.example.siidsbackend.Model.Stock;
import org.example.siidsbackend.Repository.StockRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockService {

    private final StockRepository stockRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Transactional
    public Stock createStock(StockRequestDTO dto, MultipartFile document, MultipartFile anotherDocument)
            throws IOException {
        validateStockRequest(dto, document, anotherDocument);

        Stock stock = new Stock();
        // Map DTO to Entity (Common logic to extract?)
        mapDtoToEntity(dto, stock);

        if (document != null && !document.isEmpty()) {
            stock.setDocumentPath(storeFile(document));
        }

        if (anotherDocument != null && !anotherDocument.isEmpty()) {
            stock.setAnotherDocumentPath(storeFile(anotherDocument));
        }

        return stockRepository.save(stock);
    }

    @Transactional
    public Stock updateStock(Integer id, StockRequestDTO dto, MultipartFile document, MultipartFile anotherDocument)
            throws IOException {
        // Validation for update (might be slightly different if files are optional on
        // update?)
        // For now, re-using validation but we need to handle "keep existing file" logic
        // if null passed?
        // The prompt implies strict "must fill" rules. Let's assume on update, if a
        // file is ALREADY there, it's filled.

        Stock stock = getStock(id);

        // Custom validation that considers existing state
        validateStockUpdateRequest(dto, stock, document, anotherDocument);

        mapDtoToEntity(dto, stock);

        if (document != null && !document.isEmpty()) {
            stock.setDocumentPath(storeFile(document));
        }

        if (anotherDocument != null && !anotherDocument.isEmpty()) {
            stock.setAnotherDocumentPath(storeFile(anotherDocument));
        }

        return stockRepository.save(stock);
    }

    private void mapDtoToEntity(StockRequestDTO dto, Stock stock) {
        stock.setOwnerName(dto.getOwnerName());
        stock.setTakeoverName(dto.getTakeoverName());
        stock.setSeizureNumber(dto.getSeizureNumber());
        stock.setPvNumber(dto.getPvNumber());
        stock.setTakenDate(dto.getTakenDate());
        stock.setReceivedDate(dto.getReceivedDate());
        if (dto.getItem() != null) {
            stock.setItem(Item.valueOf(dto.getItem().toUpperCase()));
        }
        stock.setItemName(dto.getItemName());
        stock.setQuantity(dto.getQuantity());
        stock.setDateReleased(dto.getDateReleased());
        stock.setReason(dto.getReason());
    }

    private void validateStockRequest(StockRequestDTO dto, MultipartFile document, MultipartFile anotherDocument) {
        validateMandatoryFields(dto);

        if (document == null || document.isEmpty()) {
            throw new IllegalArgumentException("Seizure Document is mandatory.");
        }

        validateDateLogic(dto);
        validateReleaseLogic(dto, anotherDocument != null && !anotherDocument.isEmpty(), null); // New creation, no
                                                                                                // existing doc
    }

    private void validateStockUpdateRequest(StockRequestDTO dto, Stock existingStock, MultipartFile document,
            MultipartFile anotherDocument) {
        validateMandatoryFields(dto);

        boolean hasSeizureDoc = (document != null && !document.isEmpty()) || (existingStock.getDocumentPath() != null);
        if (!hasSeizureDoc) {
            throw new IllegalArgumentException("Seizure Document is mandatory.");
        }

        validateDateLogic(dto);

        boolean hasReleaseDoc = (anotherDocument != null && !anotherDocument.isEmpty())
                || (existingStock.getAnotherDocumentPath() != null);
        validateReleaseLogic(dto, hasReleaseDoc, existingStock);
    }

    private void validateMandatoryFields(StockRequestDTO dto) {
        if (!StringUtils.hasText(dto.getOwnerName()))
            throw new IllegalArgumentException("Owner Name is required.");
        if (!StringUtils.hasText(dto.getTakeoverName()))
            throw new IllegalArgumentException("Takeover Name is required.");
        if (!StringUtils.hasText(dto.getSeizureNumber()))
            throw new IllegalArgumentException("Seizure Number is required.");
        if (!StringUtils.hasText(dto.getPvNumber()))
            throw new IllegalArgumentException("PV Number is required.");
        if (dto.getTakenDate() == null)
            throw new IllegalArgumentException("Taken Date is required.");
        if (dto.getReceivedDate() == null)
            throw new IllegalArgumentException("Received Date is required.");
        if (dto.getItem() == null)
            throw new IllegalArgumentException("Item Type is required.");
        if (!StringUtils.hasText(dto.getItemName()))
            throw new IllegalArgumentException("Item Name is required.");
        if (dto.getQuantity() == null || dto.getQuantity() < 1)
            throw new IllegalArgumentException("Quantity must be at least 1.");
    }

    private void validateDateLogic(StockRequestDTO dto) {
        if (dto.getReceivedDate().isBefore(dto.getTakenDate())) {
            throw new IllegalArgumentException("Received Date cannot be before Taken Date.");
        }
    }

    private void validateReleaseLogic(StockRequestDTO dto, boolean hasReleaseDocument, Stock existingStock) {
        if (dto.getDateReleased() != null) {
            // If Released Date is set -> Reason and Release Document are mandatory
            if (!StringUtils.hasText(dto.getReason())) {
                throw new IllegalArgumentException("Reason is required when Date Released is set.");
            }
            if (!hasReleaseDocument) {
                throw new IllegalArgumentException("Release Document is required when Date Released is set.");
            }
            if (dto.getDateReleased().isBefore(dto.getReceivedDate())) {
                throw new IllegalArgumentException("Date Released cannot be before Received Date.");
            }
        }
    }

    public void deleteStock(Integer id) {
        stockRepository.deleteById(id);
    }

    public List<Stock> getAllStock() {
        return stockRepository.findAll();
    }

    public Stock getStock(Integer id) {
        return stockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stock not found with id: " + id));
    }

    private String storeFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty())
            return null;

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (!originalFilename.toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("Only PDF files are allowed");
        }

        Path uploadPath = Paths.get(uploadDir).resolve("stock-documents").toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        String secureFilename = UUID.randomUUID().toString() + fileExtension;
        Path filePath = uploadPath.resolve(secureFilename);

        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return "stock-documents/" + secureFilename;
    }

    public StockResponseDTO toDTO(Stock stock) {
        StockResponseDTO dto = new StockResponseDTO();
        dto.setId(stock.getId());
        dto.setOwnerName(stock.getOwnerName());
        dto.setTakeoverName(stock.getTakeoverName());
        dto.setSeizureNumber(stock.getSeizureNumber());
        dto.setPvNumber(stock.getPvNumber());
        dto.setTakenDate(stock.getTakenDate());
        dto.setReceivedDate(stock.getReceivedDate());
        dto.setItem(stock.getItem());
        dto.setItemName(stock.getItemName());
        dto.setQuantity(stock.getQuantity());
        dto.setDocumentPath(stock.getDocumentPath());
        dto.setDateReleased(stock.getDateReleased());
        dto.setAnotherDocumentPath(stock.getAnotherDocumentPath());
        dto.setReason(stock.getReason());
        return dto;
    }
}
