package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class ReleaseNoteRequestDTO {
    private String releaseReason;
    private String recipientName;
    private String recipientIdPassport;
    private String recipientPhone;
    private Double auctionAmount;
    private String releaseDestination; // Auction, destruction, etc.
}
