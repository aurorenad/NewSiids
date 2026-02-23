package org.example.siidsbackend.DTO.Response;

import lombok.Data;
import org.example.siidsbackend.DTO.StockItemDTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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
    private String documentPath;
    private LocalDate dateReleased;
    private String releasedItem;
    private Integer quantityReleased;
    private BigDecimal soldAmount;
    private String anotherDocumentPath;
    private String reason;
}
