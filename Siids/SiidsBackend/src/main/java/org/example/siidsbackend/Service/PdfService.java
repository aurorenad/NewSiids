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
import java.util.Base64;
import java.io.IOException;

@Service
@RequiredArgsConstructor
public class PdfService {

    private final TemplateEngine templateEngine;

    public byte[] generateReleaseDocument(Stock stock) throws IOException {
        return generateReleaseDocument(stock, null);
    }

    public byte[] generateReleaseDocument(Stock stock, org.example.siidsbackend.Model.StockRelease release)
            throws IOException {
        Context context = new Context();
        context.setVariable("stock", stock);
        context.setVariable("release", release);

        String releasedBy = release != null && release.getReleasedBy() != null ? release.getReleasedBy()
                : (stock.getReleasedBy() != null ? stock.getReleasedBy() : stock.getTakeoverName());
        context.setVariable("releasedBy", releasedBy);

        ReleaseReason rReason = release != null && release.getReleaseReason() != null ? release.getReleaseReason()
                : stock.getReleaseReason();

        String templateName;
        if (rReason == ReleaseReason.CYAMUNARA) {
            templateName = "release-note-auction";
            // Extra variables for auction template
            context.setVariable("lotNumber", "02");
            var dReleased = release != null ? release.getDateReleased() : stock.getDateReleased();
            context.setVariable("auctionDate", dReleased != null ? dReleased.minusDays(2).toString() : "");
            context.setVariable("location", "MASORO");
            String reason = release != null ? release.getReason() : stock.getReason();
            context.setVariable("bidderName", (reason != null && reason.contains(":")) ? reason.split(":")[0] : "");
            context.setVariable("bidderTin", "");
        } else {
            templateName = "release-note-vehicle";
            // Extra variables for vehicle template
            // Try to get old plate number
            String oldPlate = "";
            if (stock.getItems() != null) {
                String rItemName = release != null ? release.getReleasedItemName() : stock.getReleasedItem();
                if ("ALL".equalsIgnoreCase(rItemName) || rItemName == null) {
                    oldPlate = stock.getItems().stream()
                            .filter(item -> "VEHICLE".equals(item.getItem()))
                            .map(item -> item.getPlateNumber())
                            .findFirst()
                            .orElse("");
                } else {
                    oldPlate = stock.getItems().stream()
                            .filter(item -> "VEHICLE".equals(item.getItem()) && rItemName.equals(item.getItemName()))
                            .map(item -> item.getPlateNumber())
                            .findFirst()
                            .orElse("");
                }
            }
            context.setVariable("oldPlateNumber", oldPlate);

            String newOwner = release != null && release.getNewOwner() != null ? release.getNewOwner()
                    : stock.getNewOwner();
            context.setVariable("newOwner",
                    newOwner != null ? newOwner : (stock.getTakeoverName() != null ? stock.getTakeoverName() : ""));
        }

        // --- Add Base64 Images ---
        try {
            ClassPathResource logoResource = new ClassPathResource("templates/rra.jpg");
            if (logoResource.exists()) {
                byte[] logoBytes = logoResource.getInputStream().readAllBytes();
                context.setVariable("logoBase64", Base64.getEncoder().encodeToString(logoBytes));
            }

            ClassPathResource watermarkResource = new ClassPathResource("templates/watermark.png");
            if (watermarkResource.exists()) {
                byte[] watermarkBytes = watermarkResource.getInputStream().readAllBytes();
                context.setVariable("watermarkBase64", Base64.getEncoder().encodeToString(watermarkBytes));
            }

            ClassPathResource footerResource = new ClassPathResource("templates/footer.png");
            if (footerResource.exists()) {
                byte[] footerBytes = footerResource.getInputStream().readAllBytes();
                context.setVariable("footerBase64", Base64.getEncoder().encodeToString(footerBytes));
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Could not load images for PDF generation.");
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
