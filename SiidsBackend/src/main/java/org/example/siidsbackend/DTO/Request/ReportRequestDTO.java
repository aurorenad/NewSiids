package org.example.siidsbackend.DTO.Request;

import jakarta.persistence.OneToOne;
import lombok.Data;
import org.example.siidsbackend.Model.Case;

import java.time.LocalDateTime;

@Data
public class ReportRequestDTO {
    private String description;
    private String attachmentPath;
    private Case relatedCase;
}