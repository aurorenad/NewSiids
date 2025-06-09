package org.example.siidsbackend.DTO.Request;

import lombok.Data;

import java.util.Date;
@Data
public class CaseRequestDTO {
    private Integer caseNum;
    private String informerName;
    private String informerId;
    private String tin;
    private String taxPayerName;
    private String taxPayerType;
    private String taxPayerAddress;
    private String taxPeriod;
    private Date reportedDate;
    private String summaryOfInformationCase;
}