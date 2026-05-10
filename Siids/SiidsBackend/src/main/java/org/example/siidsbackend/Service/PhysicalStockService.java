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

    public PhysicalStockService(SeizureNoteRepository seizureNoteRepository,
                                PVDocumentRepository pvDocumentRepository,
                                ReleaseNoteRepository releaseNoteRepository,
                                CaseRepo caseRepo,
                                StockRepository stockRepository,
                                StockAuditService auditService,
                                WebSocketNotificationService notificationService) {
        this.seizureNoteRepository = seizureNoteRepository;
        this.pvDocumentRepository = pvDocumentRepository;
        this.releaseNoteRepository = releaseNoteRepository;
        this.caseRepo = caseRepo;
        this.stockRepository = stockRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
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
        pv.setId(stock.getId() + 1000000);
        pv.setPvNumber(stock.getPvNumber() != null ? stock.getPvNumber() : "LEGACY-PV-" + stock.getId());
        pv.setApplicableLawReference("Legacy Imported Record");
        pv.setSeizureNote(mapLegacyStockToSeizureNote(stock));
        if (stock.getReceivedDate() != null) {
            pv.setTransferDate(stock.getReceivedDate().atStartOfDay());
            pv.setCreatedAt(stock.getReceivedDate().atStartOfDay());
        }
        return pv;
    }

    // --- TEMPORARY STOCK (PV In Charge) ---

    public List<SeizureNote> getTemporaryStock() {
        List<SeizureNote> notes = seizureNoteRepository.findAll();
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
            note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK);
            note = seizureNoteRepository.save(note);
            
            PVDocument pv = mapLegacyStockToPVDocument(stock);
            pv.setId(null);
            pv.setSeizureNote(note);
            pv = pvDocumentRepository.save(pv);
            
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
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
    public PVDocument requestMainStockEdit(Integer pvId, EditRequestDTO dto, Employee currentUser) {
        PVDocument pv = pvDocumentRepository.findById(pvId)
                .orElseThrow(() -> new IllegalArgumentException("PV Document not found"));

        SeizureNote note = pv.getSeizureNote();
        note.setStatus(PhysicalStockStatus.PENDING_PRSO_EDIT_APPROVAL);
        seizureNoteRepository.save(note);
        
        pv.setPendingEditReason(dto.getReason());
        pvDocumentRepository.save(pv);

        auditService.logAction(pv.getPvNumber(), "EDIT_REQUESTED", "Requested PV edit. Reason: " + dto.getReason(), currentUser);

        // Send Notification to PRSO topic
        NotificationDTO notification = new NotificationDTO();
        notification.setMessage("Edit requested for PV: " + pv.getPvNumber() + ". Reason: " + dto.getReason());
        notification.setSenderName(currentUser.getGivenName() + " " + currentUser.getFamilyName());
        notification.setCreatedAt(LocalDateTime.now());
        notification.setNotificationType("PV_EDIT_REQUEST");
        
        notificationService.sendNotificationToDepartment("PRSO", notification);

        return pv;
    }

    @Transactional
    public PVDocument approveMainStockEdit(Integer pvId, Employee prsoUser) {
        PVDocument pv = pvDocumentRepository.findById(pvId)
                .orElseThrow(() -> new IllegalArgumentException("PV Document not found"));

        SeizureNote note = pv.getSeizureNote();
        note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK); // Revert to active but we've logged the approval
        seizureNoteRepository.save(note);

        pv.setPendingEditReason(null);
        pvDocumentRepository.save(pv);

        auditService.logAction(pv.getPvNumber(), "EDIT_APPROVED", "PRSO Approved PV edit request", prsoUser);
        
        // Notify Stock Manager
        NotificationDTO notification = new NotificationDTO();
        notification.setMessage("Edit request for PV " + pv.getPvNumber() + " has been APPROVED.");
        notification.setSenderName(prsoUser.getGivenName() + " " + prsoUser.getFamilyName());
        notification.setNotificationType("PV_EDIT_APPROVED");
        notificationService.sendNotificationToDepartment("STOCK_MANAGER", notification);

        return pv;
    }

    @Transactional
    public void rejectMainStockEdit(Integer pvId, String reason, Employee prsoUser) {
        PVDocument pv = pvDocumentRepository.findById(pvId)
                .orElseThrow(() -> new IllegalArgumentException("PV Document not found"));

        SeizureNote note = pv.getSeizureNote();
        note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK);
        seizureNoteRepository.save(note);

        pv.setPendingEditReason(null);
        pvDocumentRepository.save(pv);

        auditService.logAction(pv.getPvNumber(), "EDIT_REJECTED", "PRSO Rejected PV edit. Reason: " + reason, prsoUser);
        
        // Notify Stock Manager
        NotificationDTO notification = new NotificationDTO();
        notification.setMessage("Edit request for PV " + pv.getPvNumber() + " was REJECTED. Reason: " + reason);
        notification.setSenderName(prsoUser.getGivenName() + " " + prsoUser.getFamilyName());
        notification.setNotificationType("PV_EDIT_REJECTED");
        notificationService.sendNotificationToDepartment("STOCK_MANAGER", notification);
    }
}
