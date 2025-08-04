package org.example.siidsbackend.DTO.Request;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class FindingsRequestDTO {
    private String findings;
    private String recommendations;
    private MultipartFile[] attachments;
    private Double principleAmount;
    private Double penaltiesAmount;
}