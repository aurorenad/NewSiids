package org.example.siidsbackend.DTO.Response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PhysicalStockRowDTO {
    private Integer id;
    private String seizureNumber;
    private String pvNumber;
    private String taxpayerTin;
    private String taxpayerName;
    private String taxpayerAddress;
    private String taxpayerContact;
    private String taxpayerType;
    private String nationalId;
    private String physicalDescription;
    private String representativeName;
    private String representativeContact;
    private String goodsDescription;
    private Double quantity;
    private String quantityType;
    private String fullDescription;
    private String locationOfSeizure;
    private String conditionOfGoods;
    private String conveyanceMeans;
    private String conveyanceRegistration;
    private String seizureReason;
    private LocalDateTime dateTimeSeized;
    private String status;
    private String returnReason;
    private LocalDateTime returnDate;
    private LocalDateTime approvedAt;
    private LocalDateTime releaseRequestedAt;
    private LocalDateTime releasedAt;
    private String auctionWinner;
    private LocalDateTime auctionDate;
    private Double auctionAmount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime actionedAt;
}
