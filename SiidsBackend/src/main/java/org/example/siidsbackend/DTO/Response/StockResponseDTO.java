package org.example.siidsbackend.DTO.Response;

import lombok.Data;
import org.example.siidsbackend.Model.Item;
import java.time.LocalDate;

@Data
public class StockResponseDTO {
    private Integer id;
    private String ownerName;
    private String takeoverName;
    private String seizureNumber;
    private String pvNumber;
    private LocalDate takenDate;
    private LocalDate receivedDate;
    private Item item;
    private String itemName;
    private Integer quantity;
    private String documentPath;
    private LocalDate dateReleased;
    private String anotherDocumentPath;
    private String reason;
}
