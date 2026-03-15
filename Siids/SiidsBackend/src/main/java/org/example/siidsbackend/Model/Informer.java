package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.text.SimpleDateFormat;
import java.util.Date;

@Entity
@Data
public class Informer {
    @Id
    private String nationalId;

    @Column(unique = true)
    private String informerId;

    private String informerName;
    private String informerGender;
    private String informerPhoneNum;
    private String informerAddress;
    private String informerEmail;

    public String generateInformerNumber() {
        String datePart = new SimpleDateFormat("yyMMdd").format(new Date());
        return "INF/" + datePart + "/" + this.nationalId;
    }
}