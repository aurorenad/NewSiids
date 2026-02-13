package org.example.siidsbackend.DTO.Request;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

@Data
public class FindingsRequestDTO {
    private String findings;
    private String recommendations;
    private Double principleAmount;
    private Double penaltiesAmount;
    private List<MultipartFile> attachmentsList;  // Change from array to list

    // Helper method for backward compatibility
    public void setAttachments(MultipartFile[] attachments) {
        if (attachments != null) {
            this.attachmentsList = Arrays.asList(attachments);
        }
    }
}