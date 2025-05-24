package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

@Entity
@Table(name = "case_record")
@Data
public class Case {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer caseNum;
    private String informerId;
    private String informerName;
    private String tin;
    private String taxPayerName;
    private String taxPayerType;
    private String taxPayerAddress;
    private String taxPeriod;
    private Date reportedDate;
    private String summaryOfInformationCase;
    private Status status;

}
