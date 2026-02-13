package org.example.siidsbackend.DTO.Request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class StockRequestDTO {
    private String ownerName;
    private String takeoverName;
    private String seizureNumber;
    private String pvNumber;
    private LocalDate takenDate;
    private LocalDate receivedDate;
    private String item; // Enum as String
    private String itemName;
    private Integer quantity;
    private LocalDate dateReleased;
    private String reason;
}
