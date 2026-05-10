package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class ReleaseNoteRequestDTO {
    private String releaseReason;
    private String recipientName;
    private String recipientIdPassport;
    private String releaseDestination; // For Main Stock (e.g. Auction, Destruction)
}
