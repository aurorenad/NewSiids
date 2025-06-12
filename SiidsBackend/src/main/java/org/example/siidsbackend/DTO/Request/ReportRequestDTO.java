package org.example.siidsbackend.DTO.Request;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDateTime;

@Data
public class ReportRequestDTO {
    private Integer id;
    private String description;
    private String attachmentPath;
    private Integer relatedCase;
    private String createdByName;
    private LocalDateTime createdAt;
}