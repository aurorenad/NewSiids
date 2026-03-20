package org.example.siidsbackend.Service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.Model.ReleaseReason;
import org.example.siidsbackend.Model.Stock;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Base64;
import java.io.IOException;

@Service
@RequiredArgsConstructor
public class PdfService {

    private final TemplateEngine templateEngine;

    public byte[] generateReleaseDocument(Stock stock) throws IOException {
        Context context = new Context();
        context.setVariable("stock", stock);
        context.setVariable("releasedBy", stock.getReleasedBy() != null ? stock.getReleasedBy() : stock.getTakeoverName());

        String templateName;
        if (stock.getReleaseReason() == ReleaseReason.CYAMUNARA) {
            templateName = "release-note-auction";
            // Extra variables for auction template
            context.setVariable("lotNumber", "02");
            context.setVariable("auctionDate", stock.getDateReleased() != null ? stock.getDateReleased().minusDays(2).toString() : "");
            context.setVariable("location", "MASORO");
            String reason = stock.getReason();
            context.setVariable("bidderName", (reason != null && reason.contains(":")) ? reason.split(":")[0] : "");
            context.setVariable("bidderTin", "");
        } else {
            templateName = "release-note-vehicle";
            // Extra variables for vehicle template
            // Try to get old plate number from first vehicle item
            String oldPlate = "";
            if (stock.getItems() != null) {
                oldPlate = stock.getItems().stream()
                    .filter(item -> "VEHICLE".equals(item.getItem()))
                    .map(item -> item.getPlateNumber())
                    .findFirst()
                    .orElse("");
            }
            context.setVariable("oldPlateNumber", oldPlate);
            context.setVariable("newOwner", stock.getNewOwner() != null ? stock.getNewOwner() : (stock.getTakeoverName() != null ? stock.getTakeoverName() : ""));
        }

        // --- Add Base64 Logo ---
        try {
            ClassPathResource logoResource = new ClassPathResource("templates/rra-logo.jpeg");
            byte[] logoBytes = logoResource.getInputStream().readAllBytes();
            String logoBase64 = Base64.getEncoder().encodeToString(logoBytes);
            context.setVariable("logoBase64", logoBase64);
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Could not load logo for PDF generation.");
        }

        String html = templateEngine.process(templateName, context);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(outputStream);
            builder.run();
            return outputStream.toByteArray();
        }
    }
}
