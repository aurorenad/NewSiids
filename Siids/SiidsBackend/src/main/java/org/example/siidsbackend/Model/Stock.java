package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

    @OneToMany(mappedBy = "stock", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StockItem> items = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "stock_documents", joinColumns = @JoinColumn(name = "stock_id"))
    @Column(name = "document_path")
    private List<String> documentPaths = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String seizureReason;

    private LocalDate dateReleased;
    private String releasedItem; // "ALL" or specific item name
    private Integer quantityReleased;
    private BigDecimal soldAmount;

    @Enumerated(EnumType.STRING)
    private ReleaseReason releaseReason;

    private String anotherDocumentPath;

    @Column(columnDefinition = "TEXT")
    private String reason;

    // Helper method to manage bidirectional relationship
    public void addItem(StockItem item) {
        items.add(item);
        item.setStock(this);
    }

    public void removeItem(StockItem item) {
        items.remove(item);
        item.setStock(null);
    }
}
