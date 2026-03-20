package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.StockRequestDTO;
import org.example.siidsbackend.DTO.Response.StockResponseDTO;
import org.example.siidsbackend.DTO.StockItemDTO;
import org.example.siidsbackend.Model.*;
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

import org.example.siidsbackend.DTO.StockReleaseDTO;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockService {

    private final StockRepository stockRepository;
    private final ItemCategoryService itemCategoryService;
    private final PdfService pdfService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Transactional
    public Stock createStock(StockRequestDTO dto, List<MultipartFile> documents, MultipartFile anotherDocument)
            throws IOException {
        validateStockRequest(dto, documents, anotherDocument);

        // Check uniqueness of seizureNumber (pvNumber is now optional and not unique)
        if (stockRepository.existsBySeizureNumber(dto.getSeizureNumber())) {
            throw new IllegalArgumentException("A stock with this Seizure Number already exists.");
        }

        Stock stock = new Stock();
        mapDtoToEntity(dto, stock);

        if (documents != null && !documents.isEmpty()) {
            for (MultipartFile doc : documents) {
                if (doc != null && !doc.isEmpty()) {
                    stock.getDocumentPaths().add(storeFile(doc));
                }
            }
        }

        if (anotherDocument != null && !anotherDocument.isEmpty()) {
            stock.setAnotherDocumentPath(storeFile(anotherDocument));
        }

        return stockRepository.save(stock);
    }

    @Transactional
    public Stock updateStock(Integer id, StockRequestDTO dto, List<MultipartFile> documents, MultipartFile anotherDocument)
            throws IOException {
        Stock stock = getStock(id);
        validateStockUpdateRequest(dto, stock, documents, anotherDocument);

        // Check uniqueness of seizureNumber (pvNumber is now optional and not unique)
        if (stockRepository.existsBySeizureNumberAndIdNot(dto.getSeizureNumber(), id)) {
            throw new IllegalArgumentException("A stock with this Seizure Number already exists.");
        }

        mapDtoToEntity(dto, stock);

        if (documents != null && !documents.isEmpty()) {
            // Depending on requirements, we might want to clear old documents or append
            // User said "a person can add more than one document", usually implies appending in edit or replacing
            // Let's assume appending for now if new ones are provided, or replacing if that's the intention.
            // But usually, it's safer to append or have a separate way to remove.
            for (MultipartFile doc : documents) {
                if (doc != null && !doc.isEmpty()) {
                    stock.getDocumentPaths().add(storeFile(doc));
                }
            }
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
        stock.setSeizureReason(dto.getSeizureReason());
        if (StringUtils.hasText(dto.getReleaseReason())) {
            try {
                stock.setReleaseReason(ReleaseReason.valueOf(dto.getReleaseReason().toUpperCase().trim()));
            } catch (IllegalArgumentException e) {
                log.error("Invalid release reason: {}", dto.getReleaseReason());
            }
        }
        stock.setNewPlateNumber(dto.getNewPlateNumber());
        stock.setNewOwner(dto.getNewOwner());
        stock.setReleasedBy(dto.getReleasedBy());
        stock.setAddedBy(dto.getAddedBy());
        stock.setStatus(dto.getStatus());

        // Clear existing items and add new ones
        stock.getItems().clear();
        if (dto.getItems() != null) {
            for (StockItemDTO itemDto : dto.getItems()) {
                StockItem item = new StockItem();
                item.setItemName(itemDto.getItemName());
                if (itemDto.getItem() != null) {
                    itemCategoryService.ensureCategoryExists(itemDto.getItem());
                    item.setItem(itemDto.getItem().toUpperCase());
                }
                item.setQuantity(itemDto.getQuantity());
                if (StringUtils.hasText(itemDto.getMeasurementUnit())) {
                    try {
                        item.setMeasurementUnit(MeasurementUnit.valueOf(itemDto.getMeasurementUnit().toUpperCase().trim()));
                    } catch (IllegalArgumentException e) {
                        log.error("Invalid measurement unit: {}", itemDto.getMeasurementUnit());
                    }
                }
                item.setItemType(itemDto.getItemType());
                item.setPlateNumber(itemDto.getPlateNumber());
                item.setChassisNumber(itemDto.getChassisNumber());
                item.setVehicleType(itemDto.getVehicleType());
                stock.addItem(item);
            }
        }
    }

    private void validateStockRequest(StockRequestDTO dto, List<MultipartFile> documents, MultipartFile anotherDocument) {
        validateMandatoryFields(dto);

        boolean hasDocs = documents != null && documents.stream().anyMatch(d -> !d.isEmpty());
        if (!hasDocs) {
            throw new IllegalArgumentException("At least one Seizure Document is mandatory.");
        }

        validateDateLogic(dto);
        validateReleaseLogic(dto, anotherDocument != null && !anotherDocument.isEmpty(), null);
    }

    private void validateStockUpdateRequest(StockRequestDTO dto, Stock existingStock, List<MultipartFile> documents,
            MultipartFile anotherDocument) {
        validateMandatoryFields(dto);

        boolean hasDocs = (documents != null && documents.stream().anyMatch(d -> !d.isEmpty())) 
                || (existingStock.getDocumentPaths() != null && !existingStock.getDocumentPaths().isEmpty());
        if (!hasDocs) {
            throw new IllegalArgumentException("At least one Seizure Document is mandatory.");
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
        // PV Number is now optional
        if (dto.getTakenDate() == null)
            throw new IllegalArgumentException("Taken Date is required.");
        if (dto.getReceivedDate() == null)
            throw new IllegalArgumentException("Received Date is required.");
        if (!StringUtils.hasText(dto.getSeizureReason()))
            throw new IllegalArgumentException("Reason for taking items is required.");

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
            
            // Validate plate number for vehicles
            if ("VEHICLE".equalsIgnoreCase(item.getItem())) {
                if (!StringUtils.hasText(item.getPlateNumber())) {
                    throw new IllegalArgumentException("Plate Number is required for vehicle item " + itemNum + ".");
                }
                if (!item.getPlateNumber().matches("^[A-Z]{3}\\d{3}[A-Z]$")) {
                    throw new IllegalArgumentException("Invalid Plate Number format for item " + itemNum + ". Expected: 3 letters, 3 numbers, 1 letter (e.g., ABC123D)");
                }
                if (!StringUtils.hasText(item.getChassisNumber())) {
                    throw new IllegalArgumentException("Chassis Number is required for vehicle item " + itemNum + ".");
                }
                if (!StringUtils.hasText(item.getVehicleType())) {
                    throw new IllegalArgumentException("Vehicle Type (as in Car, Moto, etc.) is required for vehicle item " + itemNum + ".");
                }
            }
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
/*
            if (!hasReleaseDocument) {
                throw new IllegalArgumentException("Release Document is required when Date Released is set.");
            }
            */
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
        dto.setDocumentPaths(stock.getDocumentPaths());
        dto.setSeizureReason(stock.getSeizureReason());
        dto.setDateReleased(stock.getDateReleased());
        dto.setReleasedItem(stock.getReleasedItem());
        dto.setQuantityReleased(stock.getQuantityReleased());
        dto.setSoldAmount(stock.getSoldAmount());
        dto.setAnotherDocumentPath(stock.getAnotherDocumentPath());
        dto.setReason(stock.getReason());
        dto.setReleaseReason(stock.getReleaseReason() != null ? stock.getReleaseReason().name() : null);
        dto.setNewPlateNumber(stock.getNewPlateNumber());
        dto.setNewOwner(stock.getNewOwner());
        dto.setReleasedBy(stock.getReleasedBy());
        dto.setAddedBy(stock.getAddedBy());
        dto.setStatus(stock.getStatus());

        // Map items
        if (stock.getItems() != null) {
            List<StockItemDTO> itemDtos = stock.getItems().stream().map(item -> {
                StockItemDTO itemDto = new StockItemDTO();
                itemDto.setId(item.getId());
                itemDto.setItemName(item.getItemName());
                itemDto.setItem(item.getItem());
                itemDto.setQuantity(item.getQuantity());
                itemDto.setMeasurementUnit(item.getMeasurementUnit() != null ? item.getMeasurementUnit().name() : null);
                itemDto.setItemType(item.getItemType());
                itemDto.setPlateNumber(item.getPlateNumber());
                itemDto.setChassisNumber(item.getChassisNumber());
                itemDto.setVehicleType(item.getVehicleType());
                return itemDto;
            }).collect(Collectors.toList());
            dto.setItems(itemDtos);
        } else {
            dto.setItems(new ArrayList<>());
        }

        // Map releases
        if (stock.getReleases() != null) {
            List<StockReleaseDTO> releaseDtos = stock.getReleases().stream().map(rel -> {
                StockReleaseDTO relDto = new StockReleaseDTO();
                relDto.setId(rel.getId());
                relDto.setReleasedItemName(rel.getReleasedItemName());
                relDto.setQuantityReleased(rel.getQuantityReleased());
                relDto.setReleaseReason(rel.getReleaseReason() != null ? rel.getReleaseReason().name() : null);
                relDto.setDateReleased(rel.getDateReleased());
                relDto.setSoldAmount(rel.getSoldAmount());
                relDto.setReason(rel.getReason());
                relDto.setNewPlateNumber(rel.getNewPlateNumber());
                relDto.setNewOwner(rel.getNewOwner());
                relDto.setReleasedBy(rel.getReleasedBy());
                return relDto;
            }).collect(Collectors.toList());
            dto.setReleases(releaseDtos);
        } else {
            dto.setReleases(new ArrayList<>());
        }

        return dto;
    }

    @Transactional
    public void removeDocument(Integer id, int index) {
        Stock stock = getStock(id);
        if (stock.getDocumentPaths() != null && index >= 0 && index < stock.getDocumentPaths().size()) {
            stock.getDocumentPaths().remove(index);
            stockRepository.save(stock);
        }
    }

    public byte[] generateReleasePdf(Stock stock) throws IOException {
        return pdfService.generateReleaseDocument(stock);
    }
}
