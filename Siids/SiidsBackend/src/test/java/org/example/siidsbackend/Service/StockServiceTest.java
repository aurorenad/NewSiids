package org.example.siidsbackend.Service;

import org.example.siidsbackend.DTO.Request.StockRequestDTO;
import org.example.siidsbackend.DTO.StockItemDTO;
import org.example.siidsbackend.Repository.StockRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock
    private StockRepository stockRepository;

    @Mock
    private ItemCategoryService itemCategoryService;

    @Mock
    private PdfService pdfService;

    @InjectMocks
    private StockService stockService;

    @Test
    void validateReleaseLogic_WithReleaseDateAndNoDocument_ShouldNotThrowException() {
        // Arrange
        StockRequestDTO dto = new StockRequestDTO();
        dto.setDateReleased(LocalDate.now());
        dto.setReceivedDate(LocalDate.now().minusDays(1));
        dto.setReleasedItem("Test Item");
        dto.setQuantityReleased(5);
        dto.setReason("Release reason");
        dto.setReleaseReason("AUCTION");

        StockItemDTO item = new StockItemDTO();
        item.setItemName("Test Item");
        item.setQuantity(10);
        dto.setItems(Collections.singletonList(item));

        // Act & Assert
        // hasReleaseDocument = false
        assertDoesNotThrow(() -> {
            ReflectionTestUtils.invokeMethod(stockService, "validateReleaseLogic", dto, false, null);
        });
    }
}
