package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Random;

@Entity
@Data
public class Informer {
    @Id
    private Integer nationalId;

    @Column(unique = true)
    private String informerId;

    private String informerName;
    private String informerGender;
    private String informerPhoneNum;
    private String informerAddress;
    private String informerEmail;

    public String generateInformerNumber() {
        String datePart = new SimpleDateFormat("yyMMdd").format(new Date());
        int randomSeq = new Random().nextInt(900) + 100;
        return "INF/" + datePart + "/" + randomSeq + "/" + this.nationalId;
    }
}