package org.example.siidsbackend.Service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.time.LocalDateTime;

@Service
public class PdfService {

    private final TemplateEngine templateEngine;

    public PdfService(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    private void addCommonImages(Context context) {
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

            ClassPathResource stampResource = new ClassPathResource("templates/stamp.png");
            if (stampResource.exists()) {
                byte[] stampBytes = stampResource.getInputStream().readAllBytes();
                context.setVariable("prsoStampBase64", Base64.getEncoder().encodeToString(stampBytes));
            }

            ClassPathResource signatureResource = new ClassPathResource("templates/signature.png");
            if (signatureResource.exists()) {
                byte[] sigBytes = signatureResource.getInputStream().readAllBytes();
                context.setVariable("prsoSignatureBase64", Base64.getEncoder().encodeToString(sigBytes));
            }

            ClassPathResource footerResource = new ClassPathResource("templates/footer.png");
            if (footerResource.exists()) {
                byte[] footerBytes = footerResource.getInputStream().readAllBytes();
                context.setVariable("footerBase64", Base64.getEncoder().encodeToString(footerBytes));
            }
        } catch (Exception e) {
            System.err.println("Failed to load common images: " + e.getMessage());
        }
    }

    private byte[] renderHtmlToPdf(String html) throws IOException {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.withHtmlContent(html, new ClassPathResource("templates/").getURL().toString());
            builder.toStream(outputStream);
            builder.run();
            return outputStream.toByteArray();
        }
    }

    public byte[] generateSeizureNote(org.example.siidsbackend.Model.SeizureNote note) throws IOException {
        Context context = new Context();
        context.setVariable("note", note);
        addCommonImages(context);
        
        if (note.getOfficerSignaturePath() != null) {
            context.setVariable("officerSignatureBase64", note.getOfficerSignaturePath());
        }

        String html = templateEngine.process("seizure-note", context);
        return renderHtmlToPdf(html);
    }

    public byte[] generatePVDocument(org.example.siidsbackend.Model.PVDocument pv, org.example.siidsbackend.Model.Employee stockManager) throws IOException {
        Context context = new Context();
        context.setVariable("pv", pv);
        context.setVariable("stockManager", stockManager);
        addCommonImages(context);

        if (pv != null && pv.getSeizureNote() != null && pv.getSeizureNote().getOfficerSignaturePath() != null) {
            context.setVariable("officerSignatureBase64", pv.getSeizureNote().getOfficerSignaturePath());
        }

        String html = templateEngine.process("pv-document", context);
        return renderHtmlToPdf(html);
    }

    public byte[] generateReleaseNote(org.example.siidsbackend.Model.ReleaseNote release) throws IOException {
        Context context = new Context();
        context.setVariable("release", release);
        context.setVariable("releasedBy", release.getReleasedBy() != null ? 
            release.getReleasedBy().getGivenName() + " " + release.getReleasedBy().getFamilyName() : "N/A");
        addCommonImages(context);
        
        if ("APPROVED".equals(release.getStatus())) {
            context.setVariable("prsoApprovedBy", release.getPrsoApprover() != null ? 
                release.getPrsoApprover().getGivenName() + " " + release.getPrsoApprover().getFamilyName() : "N/A");
        }

        String html = templateEngine.process("release-note-general", context);
        return renderHtmlToPdf(html);
    }

    // --- Legacy Stock Methods (Used by StockService) ---

    public byte[] generateReleaseDocument(org.example.siidsbackend.Model.Stock stock) throws IOException {
        return generateReleaseDocument(stock, null);
    }

    public byte[] generateReleaseDocument(org.example.siidsbackend.Model.Stock stock, org.example.siidsbackend.Model.StockRelease release) throws IOException {
        Context context = new Context();
        context.setVariable("stock", stock);
        context.setVariable("release", release);
        addCommonImages(context);

        context.setVariable("releasedBy", release != null ? release.getReleasedBy() : stock.getReleasedBy());
        context.setVariable("prsoApprovedBy", release != null ? release.getPrsoApprovedBy() : "JBC MURANGIRA");

        String templateName = "release-note-vehicle";
        if (release != null && release.getReleaseReason() == org.example.siidsbackend.Model.ReleaseReason.CYAMUNARA) {
            templateName = "release-note-auction";
            context.setVariable("lotNumber", "02"); 
            context.setVariable("auctionDate", release.getDateReleased() != null ? release.getDateReleased() : stock.getDateReleased());
            context.setVariable("location", "KIGALI");
            context.setVariable("bidderName", release.getNewOwner());
            context.setVariable("bidderTin", "N/A");
        }

        if (templateName.equals("release-note-vehicle")) {
            String plate = "";
            if (stock.getItems() != null && !stock.getItems().isEmpty()) {
                plate = stock.getItems().get(0).getPlateNumber();
            }
            context.setVariable("oldPlateNumber", plate);
            context.setVariable("newOwner", release != null ? release.getNewOwner() : stock.getNewOwner());
        }

        String html = templateEngine.process(templateName, context);
        return renderHtmlToPdf(html);
    }

    public byte[] generateInvestigationReport(org.example.siidsbackend.Model.Report report) throws IOException {
        Context context = new Context();
        context.setVariable("report", report);
        addCommonImages(context);

        // Fetch signatures from report if they exist
        if (report.getSignatures() != null) {
            for (org.example.siidsbackend.Model.ReportSignature sig : report.getSignatures()) {
                if (sig.getSignaturePath() != null) {
                    if ("DIRECTOR_INTELLIGENCE".equals(sig.getSignatureRole())) {
                        context.setVariable("doiSignatureBase64", sig.getSignaturePath());
                        context.setVariable("doiSignedAt", sig.getSignedAt());
                    } else if ("ASSISTANT_COMMISSIONER".equals(sig.getSignatureRole())) {
                        context.setVariable("acSignatureBase64", sig.getSignaturePath());
                        context.setVariable("acSignedAt", sig.getSignedAt());
                    }
                }
            }
        }

        String html = templateEngine.process("investigation-report", context);
        return renderHtmlToPdf(html);
    }
}
