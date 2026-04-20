package org.example.siidsbackend.DTO.Response;

import lombok.Data;
import org.example.siidsbackend.DTO.StockItemDTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.example.siidsbackend.DTO.StockReleaseDTO;

@Data
public class StockResponseDTO {
    private Integer id;
    private String ownerName;
    private String takeoverName;
    private String seizureNumber;
    private String pvNumber;
    private LocalDate takenDate;
    private LocalDate receivedDate;
    private List<StockItemDTO> items;
    private List<String> documentPaths;
    private String seizureReason;
    private String seizureReasonCategory;

    private LocalDate dateReleased;
    private String releasedItem;
    private Integer quantityReleased;
    private BigDecimal soldAmount;
    private String anotherDocumentPath;
    private String reason;
    private String releaseReason;
    private String newPlateNumber;
    private String newOwner;
    private String releasedBy;
    private String addedBy;
    private String status;
    private List<StockReleaseDTO> releases;
}
