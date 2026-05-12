package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class EscalateRequestDTO {
    private String applicableLawReference;
    private String formalStatementText;
    private String reason;
}
