package org.example.siidsbackend.DTO;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class StockReleaseDTO {
    private Integer id;
    private String releasedItemName;
    private Integer quantityReleased;
    private String releaseReason;
    private LocalDate dateReleased;
    private BigDecimal soldAmount;
    private String reason;
    private String newPlateNumber;
    private String newOwner;
    private String releasedBy;
    private String status;
    private String prsoApprovedBy;
    private String rejectionReason;
}
