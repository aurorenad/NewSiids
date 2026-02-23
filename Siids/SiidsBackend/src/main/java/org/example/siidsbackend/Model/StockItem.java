package org.example.siidsbackend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String itemName;

    @Enumerated(EnumType.STRING)
    private Item item;

    private Integer quantity;

    @Enumerated(EnumType.STRING)
    private MeasurementUnit measurementUnit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id")
    private Stock stock;
}
