package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class SendToDirectorDTO {
    private Integer reportId;
    private String directorId;
}
