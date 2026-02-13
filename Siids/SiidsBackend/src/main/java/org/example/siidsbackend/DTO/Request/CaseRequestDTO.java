package org.example.siidsbackend.DTO.Request;

import lombok.Data;

@Data
public class CaseRequestDTO {
    private String tin;
    private String taxPayerName;
    private String taxPayerAddress;
    private String taxType;
    private String taxPeriod;
    private String summaryOfInformationCase;
    private String informerNationalId;
    private String informerName;
    private String informerPhoneNum;
    private String informerAddress;
    private String informerEmail;
    private String informerType;
    private String informerGender;
    private String referringDepartment;
}