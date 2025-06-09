package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class ReportRequestDTO {
    private String description;
    private String attachmentPath;
}