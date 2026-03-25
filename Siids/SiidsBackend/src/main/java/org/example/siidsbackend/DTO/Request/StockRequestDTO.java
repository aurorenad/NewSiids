package org.example.siidsbackend.DTO.Request;

import lombok.Data;
import org.example.siidsbackend.DTO.StockItemDTO;
import org.example.siidsbackend.DTO.StockReleaseDTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class StockRequestDTO {
    private String ownerName;
    private String takeoverName;
    private String seizureNumber;
    private String pvNumber;
    private LocalDate takenDate;
    private LocalDate receivedDate;
    private List<StockItemDTO> items;
    private String seizureReason;
    
    // Legacy single-release fields (kept for backward compatibility or ease, but essentially unused)
    private LocalDate dateReleased;
    private String releasedItem;
    private Integer quantityReleased;
    private BigDecimal soldAmount;
    private String reason;
    private String releaseReason;
    private String newPlateNumber;
    private String newOwner;
    private String releasedBy;
    private String addedBy;
    private String status;

    private List<StockReleaseDTO> releases;
}

