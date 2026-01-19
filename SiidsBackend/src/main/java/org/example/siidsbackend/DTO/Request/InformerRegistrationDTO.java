package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class InformerRegistrationDTO {
    private String nationalId;
    private String informerName;
    private String informerGender;
    private String informerPhoneNum;
    private String informerAddress;
    private String informerEmail;
}