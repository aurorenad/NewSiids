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
import org.example.siidsbackend.Repository.UserRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
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
    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;

    public PhysicalStockService(SeizureNoteRepository seizureNoteRepository,
                                PVDocumentRepository pvDocumentRepository,
                                ReleaseNoteRepository releaseNoteRepository,
                                CaseRepo caseRepo,
                                StockRepository stockRepository,
                                StockAuditService auditService,
                                WebSocketNotificationService notificationService,
                                PdfService pdfService,
                                org.example.siidsbackend.Repository.EmployeeRepo employeeRepo,
                                UserRepo userRepo,
                                PasswordEncoder passwordEncoder) {
        this.seizureNoteRepository = seizureNoteRepository;
        this.pvDocumentRepository = pvDocumentRepository;
        this.releaseNoteRepository = releaseNoteRepository;
        this.caseRepo = caseRepo;
        this.stockRepository = stockRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.pdfService = pdfService;
        this.employeeRepo = employeeRepo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
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
        note.setId(1000000 + stock.getId());
        note.setSeizureNumber(stock.getSeizureNumber() != null ? stock.getSeizureNumber() : "LEGACY-SN-" + stock.getId());
        note.setTaxpayerName(stock.getOwnerName() != null ? stock.getOwnerName() : "N/A");
        note.setTaxpayerTin("N/A"); // Legacy stock doesn't have TIN field
        note.setGoodsDescription(goods != null && !goods.isEmpty() ? goods : "N/A");
        note.setDateTimeSeized(stock.getTakenDate() != null ? stock.getTakenDate().atStartOfDay() : LocalDateTime.now());
        
        pv.setSeizureNote(note);
        
        return pv;
    }

    // --- TEMPORARY STOCK (PV In Charge) ---

    public List<SeizureNote> getTemporaryStock() {
        List<SeizureNote> notes = seizureNoteRepository.findByStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK);
        notes.addAll(seizureNoteRepository.findByStatus(PhysicalStockStatus.RETURNED_FOR_CORRECTION));
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

    public List<SeizureNote> getSeizureHistory(Employee officer) {
        return seizureNoteRepository.findByPvInChargeOrderByCreatedAtDesc(officer);
    }

    public String generateNextSeizureNumber() {
        String currentYear = String.valueOf(LocalDateTime.now().getYear());
        String nextNumber = "00001";

        java.util.Optional<SeizureNote> lastNote = seizureNoteRepository.findFirstByOrderByCreatedAtDesc();
        if (lastNote.isPresent()) {
            String lastNum = lastNote.get().getSeizureNumber();
            if (lastNum != null && lastNum.startsWith("SN-" + currentYear + "-")) {
                try {
                    String sequencePart = lastNum.substring(lastNum.lastIndexOf("-") + 1);
                    int nextSeq = Integer.parseInt(sequencePart) + 1;
                    nextNumber = String.format("%05d", nextSeq);
                } catch (Exception e) {
                    nextNumber = java.util.UUID.randomUUID().toString().substring(0, 5).toUpperCase();
                }
            }
        }
        return "SN-" + currentYear + "-" + nextNumber;
    }

    @Transactional
    public SeizureNote createSeizureNote(SeizureNoteRequestDTO dto, String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User account not found. Username: " + username));

        if (dto.getAuthorizationPassword() == null || !passwordEncoder.matches(dto.getAuthorizationPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid authorization password");
        }

        Employee currentUser = getEmployeeByUsername(username);

        SeizureNote note = new SeizureNote();
        note.setSeizureNumber(generateNextSeizureNumber());
        
        if (dto.getCaseRef() != null && !dto.getCaseRef().isEmpty()) {
            Case c = caseRepo.findByCaseNum(dto.getCaseRef()).orElse(null);
            note.setRelatedCase(c);
            
            // Auto-inherit taxpayer info from case if not provided manually
            if ((dto.getTaxpayerTin() == null || dto.getTaxpayerTin().isEmpty()) && c != null && c.getTin() != null) {
                note.setTaxpayerTin(c.getTin().getTaxPayerTIN());
                note.setTaxpayerName(c.getTin().getTaxPayerName());
                note.setTaxpayerAddress(c.getTin().getTaxPayerAddress());
                note.setTaxpayerContact(c.getTin().getTaxPayerContact());
                note.setTaxpayerType("KNOWN");
            } else {
                note.setTaxpayerTin(dto.getTaxpayerTin());
                note.setTaxpayerName(dto.getTaxpayerName());
                note.setTaxpayerAddress(dto.getTaxpayerAddress());
                note.setTaxpayerContact(dto.getTaxpayerContact());
                note.setTaxpayerType(dto.getTaxpayerType());
            }
            note.setNationalId(dto.getNationalId());
            note.setPhysicalDescription(dto.getPhysicalDescription());
            note.setRepresentativeName(dto.getRepresentativeName());
            note.setRepresentativeContact(dto.getRepresentativeContact());
        } else {
            note.setTaxpayerTin(dto.getTaxpayerTin());
            note.setTaxpayerName(dto.getTaxpayerName());
            note.setTaxpayerAddress(dto.getTaxpayerAddress());
            note.setTaxpayerContact(dto.getTaxpayerContact());
            note.setTaxpayerType(dto.getTaxpayerType());
            note.setNationalId(dto.getNationalId());
            note.setPhysicalDescription(dto.getPhysicalDescription());
            note.setRepresentativeName(dto.getRepresentativeName());
            note.setRepresentativeContact(dto.getRepresentativeContact());
        }

        note.setGoodsDescription(dto.getGoodsDescription());
        note.setSeizureReason(dto.getSeizureReason());
        note.setDateTimeSeized(dto.getDateTimeSeized() != null ? dto.getDateTimeSeized() : LocalDateTime.now());
        note.setPvInCharge(currentUser);
        note.setStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK);
        // Note: Officer digital signature is verified via password above
        note.setOfficerSignaturePath("Digital Signature verified via Password");

        SeizureNote saved = seizureNoteRepository.save(note);
        auditService.logAction(saved.getSeizureNumber(), "CREATED", "Added to Temporary Stock", currentUser);
        return saved;
    }

    @Transactional
    public SeizureNote updateSeizureNote(Integer id, SeizureNoteRequestDTO dto, String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User account not found. Username: " + username));

        if (dto.getAuthorizationPassword() == null || !passwordEncoder.matches(dto.getAuthorizationPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid authorization password");
        }

        Employee currentUser = getEmployeeByUsername(username);

        SeizureNote note = seizureNoteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Seizure note not found"));

        if (note.getStatus() != PhysicalStockStatus.IN_TEMPORARY_STOCK && note.getStatus() != PhysicalStockStatus.RETURNED_FOR_CORRECTION) {
            throw new IllegalStateException("Cannot edit seizure note in status: " + note.getStatus());
        }

        note.setTaxpayerTin(dto.getTaxpayerTin());
        note.setTaxpayerName(dto.getTaxpayerName());
        note.setTaxpayerAddress(dto.getTaxpayerAddress());
        note.setTaxpayerContact(dto.getTaxpayerContact());
        note.setTaxpayerType(dto.getTaxpayerType());
        note.setNationalId(dto.getNationalId());
        note.setPhysicalDescription(dto.getPhysicalDescription());
        note.setRepresentativeName(dto.getRepresentativeName());
        note.setRepresentativeContact(dto.getRepresentativeContact());
        note.setGoodsDescription(dto.getGoodsDescription());
        note.setSeizureReason(dto.getSeizureReason());
        if (dto.getDateTimeSeized() != null) {
            note.setDateTimeSeized(dto.getDateTimeSeized());
        }
        
        // Reset status back to IN_TEMPORARY_STOCK and clear return reason
        note.setStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK);
        note.setReturnReason(null);

        SeizureNote saved = seizureNoteRepository.save(note);
        auditService.logAction(saved.getSeizureNumber(), "UPDATED", "Corrected and saved", currentUser);
        return saved;
    }

    @Transactional
    public void returnForCorrection(Integer pvId, String reason, Employee stockManager) {
        if (pvId > 1000000) {
            Stock stock = stockRepository.findById(pvId - 1000000).orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            
            SeizureNote note = mapLegacyStockToSeizureNote(stock);
            note.setId(null);
            note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK);
            note.setPvInCharge(stockManager);
            note = seizureNoteRepository.save(note);
            
            PVDocument pv = mapLegacyStockToPVDocument(stock);
            pv.setId(null);
            pv.setSeizureNote(note);
            pv.setPvInCharge(stockManager);
            pv = pvDocumentRepository.save(pv);
            
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
            
            returnForCorrection(pv.getId(), reason, stockManager);
            return;
        }

        PVDocument pv = pvDocumentRepository.findById(pvId)
                .orElseThrow(() -> new IllegalArgumentException("PV Document not found"));

        SeizureNote note = pv.getSeizureNote();
        note.setStatus(PhysicalStockStatus.RETURNED_FOR_CORRECTION);
        note.setReturnReason(reason);
        seizureNoteRepository.save(note);

        // Notify the Surveillance Officer
        NotificationDTO notification = new NotificationDTO();
        notification.setMessage("Seizure Note " + note.getSeizureNumber() + " returned for correction. Reason: " + reason);
        notification.setSenderName(stockManager.getGivenName() + " " + stockManager.getFamilyName());
        notification.setCreatedAt(LocalDateTime.now());
        notification.setNotificationType("SEIZURE_RETURNED");

        if (note.getPvInCharge() != null) {
            notificationService.sendNotificationToUser(note.getPvInCharge().getEmployeeId(), notification);
        }

        auditService.logAction(note.getSeizureNumber(), "RETURNED_FOR_CORRECTION", "Returned by Stock Manager. Reason: " + reason, stockManager);
        
        // Remove references in ReleaseNotes to allow deletion
        List<ReleaseNote> relatedReleases = releaseNoteRepository.findByPvDocument(pv);
        for (ReleaseNote release : relatedReleases) {
            release.setPvDocument(null);
            releaseNoteRepository.save(release);
        }

        // Remove the PV Document as it's no longer in Main Stock
        pvDocumentRepository.delete(pv);
    }

    @Transactional
    public ReleaseNote releaseFromTemporaryStock(Integer seizureId, ReleaseNoteRequestDTO dto, Employee currentUser) {
        if (seizureId > 1000000) {
            Stock stock = stockRepository.findById(seizureId - 1000000).orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            SeizureNote mapped = mapLegacyStockToSeizureNote(stock);
            mapped.setId(null);
            mapped.setStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK);
            mapped.setPvInCharge(currentUser);
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
        note.setActionedAt(LocalDateTime.now());
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
            mapped.setPvInCharge(currentUser);
            mapped = seizureNoteRepository.save(mapped);
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
            return escalateToMainStock(mapped.getId(), dto, currentUser);
        }

        SeizureNote note = seizureNoteRepository.findById(seizureId)
                .orElseThrow(() -> new IllegalArgumentException("Seizure note not found"));

        if (note.getStatus() != PhysicalStockStatus.IN_TEMPORARY_STOCK && 
            note.getStatus() != PhysicalStockStatus.PENDING_JUSTIFICATION && 
            note.getStatus() != PhysicalStockStatus.RETURNED_FOR_CORRECTION) {
            throw new IllegalStateException("Cannot escalate from current status: " + note.getStatus());
        }

        note.setStatus(PhysicalStockStatus.ESCALATED);
        note.setReturnReason(null);
        note.setActionedAt(LocalDateTime.now());
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

    public List<ReleaseNote> getPendingApprovals() {
        return releaseNoteRepository.findByStatus("PENDING");
    }

    public List<ReleaseNote> getApprovalHistory() {
        return releaseNoteRepository.findByStatusInOrderByCreatedAtDesc(List.of("APPROVED", "REJECTED"));
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
            note.setPvInCharge(currentUser); // Set persistent user
            note = seizureNoteRepository.save(note);
            
            PVDocument pv = mapLegacyStockToPVDocument(stock);
            pv.setId(null);
            pv.setSeizureNote(note);
            pv.setPvInCharge(currentUser); // Ensure persistent employee is set
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
        release.setSeizureNote(note); // Link to SN for direct access

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
        release.setStatus("APPROVED");
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
        note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK); // Revert status for note
        seizureNoteRepository.save(note);

        release.setStatus("REJECTED");
        release.setRejectionReason(reason);
        release.setPrsoApprover(prsoUser);
        release.setPrsoApprovalDate(java.time.LocalDateTime.now());
        releaseNoteRepository.save(release);

        auditService.logAction(release.getPvDocument().getPvNumber(), "RELEASE_REJECTED", "PRSO Rejected Release. Reason: " + reason, prsoUser);
    }

    // Edit request methods removed as per requirements

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

    public byte[] generateReleaseNotePdf(Integer releaseId) throws java.io.IOException {
        ReleaseNote release = releaseNoteRepository.findById(releaseId)
                .orElseThrow(() -> new IllegalArgumentException("Release note not found"));
        return pdfService.generateReleaseNote(release);
    }
    public byte[] generateReleaseNotePreview(java.util.Map<String, String> payload) throws java.io.IOException {
        Integer pvId = Integer.parseInt(payload.get("pvId"));
        PVDocument pv = pvDocumentRepository.findById(pvId)
                .orElseThrow(() -> new IllegalArgumentException("PV Document not found"));

        ReleaseNote draft = new ReleaseNote();
        draft.setReleaseNumber("RN-DRAFT-" + System.currentTimeMillis() % 10000);
        draft.setReleaseReason(payload.get("releaseReason"));
        draft.setReleaseDestination(payload.get("releaseDestination"));
        draft.setRecipientName(payload.get("recipientName"));
        draft.setRecipientIdPassport(payload.get("recipientIdPassport"));
        draft.setPvDocument(pv);
        draft.setSeizureNote(pv.getSeizureNote());
        draft.setCreatedAt(java.time.LocalDateTime.now());
        draft.setStatus("DRAFT");

        return pdfService.generateReleaseNote(draft);
    }
}