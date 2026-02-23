package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.StockRequestDTO;
import org.example.siidsbackend.DTO.Response.StockResponseDTO;
import org.example.siidsbackend.DTO.StockItemDTO;
import org.example.siidsbackend.Model.Item;
import org.example.siidsbackend.Model.MeasurementUnit;
import org.example.siidsbackend.Model.Stock;
import org.example.siidsbackend.Model.StockItem;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

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
        Stock stock = getStock(id);
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
        stock.setDateReleased(dto.getDateReleased());
        stock.setReleasedItem(dto.getReleasedItem());
        stock.setQuantityReleased(dto.getQuantityReleased());
        stock.setSoldAmount(dto.getSoldAmount());
        stock.setReason(dto.getReason());

        // Clear existing items and add new ones
        stock.getItems().clear();
        if (dto.getItems() != null) {
            for (StockItemDTO itemDto : dto.getItems()) {
                StockItem item = new StockItem();
                item.setItemName(itemDto.getItemName());
                if (itemDto.getItem() != null) {
                    item.setItem(Item.valueOf(itemDto.getItem().toUpperCase()));
                }
                item.setQuantity(itemDto.getQuantity());
                if (itemDto.getMeasurementUnit() != null) {
                    item.setMeasurementUnit(MeasurementUnit.valueOf(itemDto.getMeasurementUnit().toUpperCase()));
                }
                stock.addItem(item);
            }
        }
    }

    private void validateStockRequest(StockRequestDTO dto, MultipartFile document, MultipartFile anotherDocument) {
        validateMandatoryFields(dto);

        if (document == null || document.isEmpty()) {
            throw new IllegalArgumentException("Seizure Document is mandatory.");
        }

        validateDateLogic(dto);
        validateReleaseLogic(dto, anotherDocument != null && !anotherDocument.isEmpty(), null);
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

        // Validate items
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item is required.");
        }
        for (int i = 0; i < dto.getItems().size(); i++) {
            StockItemDTO item = dto.getItems().get(i);
            int itemNum = i + 1;
            if (!StringUtils.hasText(item.getItemName()))
                throw new IllegalArgumentException("Item Name is required for item " + itemNum + ".");
            if (item.getItem() == null || item.getItem().isBlank())
                throw new IllegalArgumentException("Item Type is required for item " + itemNum + ".");
            if (item.getQuantity() == null || item.getQuantity() <= 0)
                throw new IllegalArgumentException("Quantity must be greater than zero for item " + itemNum + ".");
            if (item.getMeasurementUnit() == null || item.getMeasurementUnit().isBlank())
                throw new IllegalArgumentException("Measurement Unit is required for item " + itemNum + ".");
        }
    }

    private void validateDateLogic(StockRequestDTO dto) {
        if (dto.getReceivedDate().isBefore(dto.getTakenDate())) {
            throw new IllegalArgumentException("Received Date cannot be before Taken Date.");
        }
    }

    private void validateReleaseLogic(StockRequestDTO dto, boolean hasReleaseDocument, Stock existingStock) {
        if (dto.getDateReleased() != null) {
            if (!StringUtils.hasText(dto.getReason())) {
                throw new IllegalArgumentException("Reason is required when Date Released is set.");
            }
            if (!hasReleaseDocument) {
                throw new IllegalArgumentException("Release Document is required when Date Released is set.");
            }
            if (dto.getDateReleased().isBefore(dto.getReceivedDate())) {
                throw new IllegalArgumentException("Date Released cannot be before Received Date.");
            }

            // Validate quantity released
            if (dto.getQuantityReleased() == null || dto.getQuantityReleased() <= 0) {
                throw new IllegalArgumentException(
                        "Quantity Released must be greater than zero when Date Released is set.");
            }

            // Validate released item selection
            if (!StringUtils.hasText(dto.getReleasedItem())) {
                throw new IllegalArgumentException("Released Item selection is required when Date Released is set.");
            }

            // Determine max quantity based on which item is released
            int maxQuantity;
            if ("ALL".equalsIgnoreCase(dto.getReleasedItem())) {
                maxQuantity = dto.getItems().stream()
                        .mapToInt(StockItemDTO::getQuantity)
                        .sum();
            } else {
                maxQuantity = dto.getItems().stream()
                        .filter(i -> dto.getReleasedItem().equals(i.getItemName()))
                        .mapToInt(StockItemDTO::getQuantity)
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Released Item '" + dto.getReleasedItem() + "' not found in items list."));
            }

            if (dto.getQuantityReleased() > maxQuantity) {
                throw new IllegalArgumentException(
                        "Quantity Released (" + dto.getQuantityReleased() + ") cannot exceed available quantity ("
                                + maxQuantity + ").");
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
        dto.setDocumentPath(stock.getDocumentPath());
        dto.setDateReleased(stock.getDateReleased());
        dto.setReleasedItem(stock.getReleasedItem());
        dto.setQuantityReleased(stock.getQuantityReleased());
        dto.setSoldAmount(stock.getSoldAmount());
        dto.setAnotherDocumentPath(stock.getAnotherDocumentPath());
        dto.setReason(stock.getReason());

        // Map items
        if (stock.getItems() != null) {
            List<StockItemDTO> itemDtos = stock.getItems().stream().map(item -> {
                StockItemDTO itemDto = new StockItemDTO();
                itemDto.setId(item.getId());
                itemDto.setItemName(item.getItemName());
                itemDto.setItem(item.getItem() != null ? item.getItem().name() : null);
                itemDto.setQuantity(item.getQuantity());
                itemDto.setMeasurementUnit(item.getMeasurementUnit() != null ? item.getMeasurementUnit().name() : null);
                return itemDto;
            }).collect(Collectors.toList());
            dto.setItems(itemDtos);
        } else {
            dto.setItems(new ArrayList<>());
        }

        return dto;
    }
}
