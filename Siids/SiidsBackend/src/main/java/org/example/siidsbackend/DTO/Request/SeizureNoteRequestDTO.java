package org.example.siidsbackend.DTO.Request;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SeizureNoteRequestDTO {
    private String caseRef;
    private String taxpayerTin;
    private String taxpayerName;
    private String taxpayerAddress;
    private String taxpayerContact;
    private String taxpayerType; // KNOWN or UNKNOWN
    private String nationalId;
    private String physicalDescription;
    private String representativeName;
    private String representativeContact;
    private String goodsDescription;
    private String seizureReason;
    private LocalDateTime dateTimeSeized;
    private String officerSignatureBase64;
}
