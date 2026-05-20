package org.example.siidsbackend.Service;

import org.example.siidsbackend.DTO.NotificationDTO;
import org.example.siidsbackend.DTO.Request.EditRequestDTO;
import org.example.siidsbackend.DTO.Request.EscalateRequestDTO;
import org.example.siidsbackend.DTO.Request.ReleaseNoteRequestDTO;
import org.example.siidsbackend.DTO.Request.SeizureNoteRequestDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Repository.CaseRepo;
import org.example.siidsbackend.Repository.PVDocumentRepository;
import org.example.siidsbackend.Repository.ReleaseNoteRepository;
import org.example.siidsbackend.Repository.SeizureNoteRepository;
import org.example.siidsbackend.Repository.StockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PhysicalStockService {

    private final SeizureNoteRepository seizureNoteRepository;
    private final PVDocumentRepository pvDocumentRepository;
    private final ReleaseNoteRepository releaseNoteRepository;
    private final CaseRepo caseRepo;
    private final StockRepository stockRepository;
    private final StockAuditService auditService;
    private final WebSocketNotificationService notificationService;
    private final PdfService pdfService;
    private final org.example.siidsbackend.Repository.EmployeeRepo employeeRepo;

    public PhysicalStockService(SeizureNoteRepository seizureNoteRepository,
                                PVDocumentRepository pvDocumentRepository,
                                ReleaseNoteRepository releaseNoteRepository,
                                CaseRepo caseRepo,
                                StockRepository stockRepository,
                                StockAuditService auditService,
                                WebSocketNotificationService notificationService,
                                PdfService pdfService,
                                org.example.siidsbackend.Repository.EmployeeRepo employeeRepo) {
        this.seizureNoteRepository = seizureNoteRepository;
        this.pvDocumentRepository = pvDocumentRepository;
        this.releaseNoteRepository = releaseNoteRepository;
        this.caseRepo = caseRepo;
        this.stockRepository = stockRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.pdfService = pdfService;
        this.employeeRepo = employeeRepo;
    }

    public Employee getEmployeeByUsername(String username) {
        return employeeRepo.findByEmployeeId(username)
                .orElseThrow(() -> new IllegalStateException("Employee record not found for username: " + username));
    }

    // --- LEGACY MAPPING HELPERS ---
    private SeizureNote mapLegacyStockToSeizureNote(Stock stock) {
        SeizureNote note = new SeizureNote();
        note.setId(stock.getId() + 1000000);
        note.setSeizureNumber(stock.getSeizureNumber() != null ? stock.getSeizureNumber() : "LEGACY-" + stock.getId());
        note.setTaxpayerName(stock.getOwnerName());
        
        String goods = "";
        if (stock.getItems() != null && !stock.getItems().isEmpty()) {
            goods = stock.getItems().stream().map(i -> i.getQuantity() + "x " + i.getItemName()).reduce((a, b) -> a + ", " + b).orElse("");
        }
        note.setGoodsDescription(goods);
        note.setSeizureReason(stock.getSeizureReason());
        if (stock.getTakenDate() != null) {
            note.setDateTimeSeized(stock.getTakenDate().atStartOfDay());
        } else {
            note.setDateTimeSeized(LocalDateTime.now());
        }
        
        if ("ACTIVE".equals(stock.getStatus())) {
            note.setStatus(stock.getPvNumber() != null && !stock.getPvNumber().trim().isEmpty() ? PhysicalStockStatus.IN_MAIN_STOCK : PhysicalStockStatus.IN_TEMPORARY_STOCK);
        } else if ("RELEASED".equals(stock.getStatus())) {
            note.setStatus(PhysicalStockStatus.RELEASED_FROM_TEMP);
        }
        return note;
    }

    private PVDocument mapLegacyStockToPVDocument(Stock stock) {
        PVDocument pv = new PVDocument();
        pv.setId(1000000 + stock.getId());
        pv.setPvNumber(stock.getPvNumber() != null ? stock.getPvNumber() : "LEGACY-PV-" + stock.getId());
        pv.setTransferDate(stock.getReceivedDate() != null ? stock.getReceivedDate().atStartOfDay() : LocalDateTime.now());
        pv.setCreatedAt(stock.getReceivedDate() != null ? stock.getReceivedDate().atStartOfDay() : LocalDateTime.now());
        
        String goods = "";
        if (stock.getItems() != null && !stock.getItems().isEmpty()) {
            goods = stock.getItems().stream().map(i -> i.getQuantity() + "x " + i.getItemName()).reduce((a, b) -> a + ", " + b).orElse("");
        }
        
        pv.setFormalStatementText("Legacy Imported Record: " + (goods != null && !goods.isEmpty() ? goods : "No items listed."));
        pv.setApplicableLawReference("EAC Customs Management Act, 2004");
        
        SeizureNote note = new SeizureNote();
        note.setSeizureNumber(stock.getSeizureNumber() != null ? stock.getSeizureNumber() : "LEGACY-SN-" + stock.getId());
        note.setTaxpayerName(stock.getOwnerName() != null ? stock.getOwnerName() : "N/A");
        note.setTaxpayerTin("N/A"); // Legacy stock doesn't have TIN field
        note.setGoodsDescription(goods != null && !goods.isEmpty() ? goods : "N/A");
        note.setDateTimeSeized(stock.getTakenDate() != null ? stock.getTakenDate().atStartOfDay() : LocalDateTime.now());
        
        pv.setSeizureNote(note);
        
        Employee legacyOfficer = new Employee();
        legacyOfficer.setGivenName("Proper");
        legacyOfficer.setFamilyName("Officer");
        legacyOfficer.setEmployeeId("LEGACY-OFFICER");
        pv.setPvInCharge(legacyOfficer);
        
        return pv;
    }

    // --- TEMPORARY STOCK (PV In Charge) ---

    public List<SeizureNote> getTemporaryStock() {
        List<SeizureNote> notes = seizureNoteRepository.findByStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK);
        List<Stock> legacyStocks = stockRepository.findByStatusIsNullOrStatus("ACTIVE");
        if (legacyStocks != null) {
            for (Stock s : legacyStocks) {
                if (s.getPvNumber() == null || s.getPvNumber().trim().isEmpty()) {
                    notes.add(mapLegacyStockToSeizureNote(s));
                }
            }
        }
        return notes;
    }

    @Transactional
    public SeizureNote createSeizureNote(SeizureNoteRequestDTO dto, Employee currentUser) {
        SeizureNote note = new SeizureNote();
        note.setSeizureNumber("SN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        
        if (dto.getCaseRef() != null && !dto.getCaseRef().isEmpty()) {
            Case c = caseRepo.findByCaseNum(dto.getCaseRef()).orElse(null);
            note.setRelatedCase(c);
        }

        note.setTaxpayerTin(dto.getTaxpayerTin());
        note.setTaxpayerName(dto.getTaxpayerName());
        note.setGoodsDescription(dto.getGoodsDescription());
        note.setSeizureReason(dto.getSeizureReason());
        note.setDateTimeSeized(dto.getDateTimeSeized());
        note.setPvInCharge(currentUser);
        note.setStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK);
        note.setOfficerSignaturePath(dto.getOfficerSignatureBase64());

        SeizureNote saved = seizureNoteRepository.save(note);
        auditService.logAction(saved.getSeizureNumber(), "CREATED", "Added to Temporary Stock", currentUser);
        return saved;
    }

    @Transactional
    public ReleaseNote releaseFromTemporaryStock(Integer seizureId, ReleaseNoteRequestDTO dto, Employee currentUser) {
        if (seizureId > 1000000) {
            Stock stock = stockRepository.findById(seizureId - 1000000).orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            SeizureNote mapped = mapLegacyStockToSeizureNote(stock);
            mapped.setId(null);
            mapped.setStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK);
            mapped = seizureNoteRepository.save(mapped);
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
            return releaseFromTemporaryStock(mapped.getId(), dto, currentUser);
        }

        SeizureNote note = seizureNoteRepository.findById(seizureId)
                .orElseThrow(() -> new IllegalArgumentException("Seizure note not found"));

        if (note.getStatus() != PhysicalStockStatus.IN_TEMPORARY_STOCK && note.getStatus() != PhysicalStockStatus.PENDING_JUSTIFICATION) {
            throw new IllegalStateException("Cannot release from current status: " + note.getStatus());
        }

        note.setStatus(PhysicalStockStatus.RELEASED_FROM_TEMP);
        seizureNoteRepository.save(note);

        ReleaseNote release = new ReleaseNote();
        release.setReleaseNumber("RN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        release.setSeizureNote(note);
        release.setReleaseType("TEMP_STOCK");
        release.setReleaseReason(dto.getReleaseReason());
        release.setRecipientName(dto.getRecipientName());
        release.setRecipientIdPassport(dto.getRecipientIdPassport());
        release.setReleasedBy(currentUser);
        
        ReleaseNote savedRelease = releaseNoteRepository.save(release);
        auditService.logAction(note.getSeizureNumber(), "RELEASED", "Released from Temporary Stock. Reason: " + dto.getReleaseReason(), currentUser);
        return savedRelease;
    }

    @Transactional
    public PVDocument escalateToMainStock(Integer seizureId, EscalateRequestDTO dto, Employee currentUser) {
        if (seizureId > 1000000) {
            Stock stock = stockRepository.findById(seizureId - 1000000).orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            SeizureNote mapped = mapLegacyStockToSeizureNote(stock);
            mapped.setId(null);
            mapped.setStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK);
            mapped = seizureNoteRepository.save(mapped);
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
            return escalateToMainStock(mapped.getId(), dto, currentUser);
        }

        SeizureNote note = seizureNoteRepository.findById(seizureId)
                .orElseThrow(() -> new IllegalArgumentException("Seizure note not found"));

        if (note.getStatus() != PhysicalStockStatus.IN_TEMPORARY_STOCK && note.getStatus() != PhysicalStockStatus.PENDING_JUSTIFICATION) {
            throw new IllegalStateException("Cannot escalate from current status: " + note.getStatus());
        }

        note.setStatus(PhysicalStockStatus.ESCALATED);
        seizureNoteRepository.save(note);

        PVDocument pv = new PVDocument();
        pv.setPvNumber("PV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        pv.setSeizureNote(note);
        pv.setApplicableLawReference(dto.getApplicableLawReference());
        pv.setFormalStatementText(dto.getFormalStatementText());
        pv.setPvInCharge(currentUser);

        PVDocument savedPv = pvDocumentRepository.save(pv);
        
        auditService.logAction(note.getSeizureNumber(), "ESCALATED", "Escalated to Main Stock via PV: " + savedPv.getPvNumber() + ". Reason: " + dto.getReason(), currentUser);
        auditService.logAction(savedPv.getPvNumber(), "CREATED", "Entered Main Stock from Temp Stock", currentUser);
        
        // Advance note status to main stock
        note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK);
        seizureNoteRepository.save(note);

        return savedPv;
    }

    // --- MAIN STOCK (Stock Manager & PRSO) ---

    public List<PVDocument> getPendingApprovals() {
        return pvDocumentRepository.findAll().stream()
                .filter(pv -> pv.getSeizureNote().getStatus() == PhysicalStockStatus.PENDING_PRSO_RELEASE_APPROVAL ||
                             pv.getSeizureNote().getStatus() == PhysicalStockStatus.PENDING_PRSO_EDIT_APPROVAL)
                .toList();
    }

    public List<PVDocument> getMainStock() {
        List<PVDocument> pvs = pvDocumentRepository.findAll();
        List<Stock> legacyStocks = stockRepository.findByStatusIsNullOrStatus("ACTIVE");
        if (legacyStocks != null) {
            for (Stock s : legacyStocks) {
                if (s.getPvNumber() != null && !s.getPvNumber().trim().isEmpty()) {
                    pvs.add(mapLegacyStockToPVDocument(s));
                }
            }
        }
        return pvs;
    }

    @Transactional
    public ReleaseNote requestMainStockRelease(Integer pvId, ReleaseNoteRequestDTO dto, Employee currentUser) {
        if (pvId > 1000000) {
            Stock stock = stockRepository.findById(pvId - 1000000).orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            
            SeizureNote note = mapLegacyStockToSeizureNote(stock);
            note.setId(null);
            note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK); // Ensure status is set for the check below
            note = seizureNoteRepository.save(note);
            
            PVDocument pv = mapLegacyStockToPVDocument(stock);
            pv.setId(null);
            pv.setSeizureNote(note);
            pv = pvDocumentRepository.save(pv);
            
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
            
            // Re-fetch to ensure clean state for recursion
            return requestMainStockRelease(pv.getId(), dto, currentUser);
        }

        PVDocument pv = pvDocumentRepository.findById(pvId)
                .orElseThrow(() -> new IllegalArgumentException("PV Document not found"));

        SeizureNote note = pv.getSeizureNote();
        if (note.getStatus() != PhysicalStockStatus.IN_MAIN_STOCK) {
            throw new IllegalStateException("Cannot request release. Item not in main stock.");
        }

        note.setStatus(PhysicalStockStatus.PENDING_PRSO_RELEASE_APPROVAL);
        seizureNoteRepository.save(note);

        ReleaseNote release = new ReleaseNote();
        release.setReleaseNumber("RN-M-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        release.setPvDocument(pv);
        release.setReleaseType("MAIN_STOCK");
        release.setReleaseReason(dto.getReleaseReason());
        release.setReleaseDestination(dto.getReleaseDestination());
        release.setRecipientName(dto.getRecipientName());
        release.setRecipientIdPassport(dto.getRecipientIdPassport());
        release.setReleasedBy(currentUser);

        ReleaseNote savedRelease = releaseNoteRepository.save(release);
        auditService.logAction(pv.getPvNumber(), "RELEASE_REQUESTED", "Release request submitted to PRSO", currentUser);
        return savedRelease;
    }

    @Transactional
    public ReleaseNote approveMainStockRelease(Integer releaseId, Employee prsoUser) {
        ReleaseNote release = releaseNoteRepository.findById(releaseId)
                .orElseThrow(() -> new IllegalArgumentException("Release note not found"));

        if (!"MAIN_STOCK".equals(release.getReleaseType())) {
            throw new IllegalArgumentException("Only Main Stock releases require PRSO approval");
        }

        SeizureNote note = release.getPvDocument().getSeizureNote();
        if (note.getStatus() != PhysicalStockStatus.PENDING_PRSO_RELEASE_APPROVAL) {
            throw new IllegalStateException("Item is not pending release approval");
        }

        release.setPrsoApprover(prsoUser);
        release.setPrsoApprovalDate(java.time.LocalDateTime.now());
        releaseNoteRepository.save(release);

        note.setStatus(PhysicalStockStatus.RELEASED_FROM_MAIN);
        seizureNoteRepository.save(note);

        auditService.logAction(release.getPvDocument().getPvNumber(), "RELEASE_APPROVED", "PRSO Approved Release to " + release.getReleaseDestination(), prsoUser);
        return release;
    }

    @Transactional
    public void rejectMainStockRelease(Integer releaseId, String reason, Employee prsoUser) {
        ReleaseNote release = releaseNoteRepository.findById(releaseId)
                .orElseThrow(() -> new IllegalArgumentException("Release note not found"));

        SeizureNote note = release.getPvDocument().getSeizureNote();
        note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK); // Revert status
        seizureNoteRepository.save(note);

        auditService.logAction(release.getPvDocument().getPvNumber(), "RELEASE_REJECTED", "PRSO Rejected Release. Reason: " + reason, prsoUser);
        releaseNoteRepository.delete(release); // Discard the request
    }

    @Transactional
    public PVDocument returnToOfficer(Integer pvId, EditRequestDTO dto, Employee currentUser) {
        PVDocument pv = pvDocumentRepository.findById(pvId)
                .orElseThrow(() -> new IllegalArgumentException("PV Document not found"));

        SeizureNote note = pv.getSeizureNote();
        note.setStatus(PhysicalStockStatus.RETURNED_TO_OFFICER);
        seizureNoteRepository.save(note);
        
        pv.setPendingEditReason(dto.getReason());
        pvDocumentRepository.save(pv);

        String linkedToken = UUID.randomUUID().toString();
        auditService.logActionWithToken(pv.getPvNumber(), "RETURNED_TO_OFFICER", "Returned to officer for correction. Reason: " + dto.getReason(), currentUser, linkedToken);

        // Send Notification to Surveillance Officer
        NotificationDTO notification = new NotificationDTO();
        notification.setMessage("Your PV " + pv.getPvNumber() + " was returned for correction. Reason: " + dto.getReason());
        notification.setSenderName(currentUser.getGivenName() + " " + currentUser.getFamilyName());
        notification.setCreatedAt(LocalDateTime.now());
        notification.setNotificationType("PV_RETURNED");
        
        if (pv.getPvInCharge() != null) {
            notificationService.sendNotificationToUser(pv.getPvInCharge().getEmployeeId(), notification);
        }

        return pv;
    }

    @Transactional
    public PVDocument resubmitPv(Integer pvId, EditRequestDTO dto, Employee currentUser) {
        PVDocument pv = pvDocumentRepository.findById(pvId)
                .orElseThrow(() -> new IllegalArgumentException("PV Document not found"));

        SeizureNote note = pv.getSeizureNote();
        if (note.getStatus() != PhysicalStockStatus.RETURNED_TO_OFFICER) {
            throw new IllegalStateException("PV is not in RETURNED_TO_OFFICER state");
        }

        note.setStatus(PhysicalStockStatus.CORRECTED_AND_RESUBMITTED);
        seizureNoteRepository.save(note);
        
        pv.setPendingEditReason(null);
        pvDocumentRepository.save(pv);

        // Find the linkedToken from the latest RETURNED_TO_OFFICER log for this PV
        List<StockAuditLog> logs = auditService.getLogsForReference(pv.getPvNumber());
        String linkedToken = null;
        for (StockAuditLog log : logs) {
            if ("RETURNED_TO_OFFICER".equals(log.getActionType()) && log.getLinkedToken() != null) {
                linkedToken = log.getLinkedToken();
                break;
            }
        }

        auditService.logActionWithToken(pv.getPvNumber(), "CORRECTED_AND_RESUBMITTED", "Officer resubmitted the PV after correction. Details: " + dto.getReason(), currentUser, linkedToken);

        // Notify Stock Manager
        NotificationDTO notification = new NotificationDTO();
        notification.setMessage("PV " + pv.getPvNumber() + " has been corrected and resubmitted.");
        notification.setSenderName(currentUser.getGivenName() + " " + currentUser.getFamilyName());
        notification.setCreatedAt(LocalDateTime.now());
        notification.setNotificationType("PV_RESUBMITTED");
        notificationService.sendNotificationToDepartment("STOCK_MANAGER", notification);

        return pv;
    }



    public byte[] generateSeizureNotePdf(Integer seizureId) throws java.io.IOException {
        if (seizureId > 1000000) {
            Stock stock = stockRepository.findById(seizureId - 1000000)
                    .orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            SeizureNote mapped = mapLegacyStockToSeizureNote(stock);
            return pdfService.generateSeizureNote(mapped);
        }

        SeizureNote note = seizureNoteRepository.findById(seizureId)
                .orElseThrow(() -> new IllegalArgumentException("Seizure note not found"));
        return pdfService.generateSeizureNote(note);
    }

    public byte[] generatePVDocumentPdf(Integer pvId, String username) throws java.io.IOException {
        // Find employee by username (assuming username is the employeeId)
        Employee stockManager = employeeRepo.findByEmployeeId(username)
                .orElse(null);

        if (pvId > 1000000) {
            Stock stock = stockRepository.findById(pvId - 1000000)
                    .orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            PVDocument mapped = mapLegacyStockToPVDocument(stock);
            return pdfService.generatePVDocument(mapped, stockManager);
        }

        PVDocument pv = pvDocumentRepository.findById(pvId)
                .orElseThrow(() -> new IllegalArgumentException("PV Document not found"));
        return pdfService.generatePVDocument(pv, stockManager);
    }
}
