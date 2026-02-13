package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Stock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String ownerName;
    private String takeoverName;
    private String seizureNumber;
    private String pvNumber;
    private LocalDate takenDate;
    private LocalDate receivedDate;

    @Enumerated(EnumType.STRING)
    private Item item;

    private String itemName;
    private Integer quantity;

    private String documentPath;

    private LocalDate dateReleased;

    private String anotherDocumentPath;

    @Column(columnDefinition = "TEXT")
    private String reason;
}
