package org.example.siidsbackend.DTO;

import lombok.Data;

@Data
public class StockItemDTO {
    private Integer id;
    private String itemName;
    private String item; // Item enum as String
    private Integer quantity;
    private String measurementUnit; // MeasurementUnit enum as String
}
