package org.example.siidsbackend.Model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Informer {
    @Id
    private String informerId;
    private String informerName;
    private String informerPhoneNum;
    private String informerAddress;
}
