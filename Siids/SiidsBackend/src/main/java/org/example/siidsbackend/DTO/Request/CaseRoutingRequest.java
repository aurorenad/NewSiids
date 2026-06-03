package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class CaseRoutingRequest {
    private String departmentName;
    private String routingNotes;
}
