package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class SignReportRequest {
    private String signatureBase64;
    private String role;
}
