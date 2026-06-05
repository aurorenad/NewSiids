package org.example.siidsbackend.Service;

import org.example.siidsbackend.DTO.NotificationDTO;
import org.example.siidsbackend.DTO.Request.EditRequestDTO;
import org.example.siidsbackend.DTO.Request.EscalateRequestDTO;
import org.example.siidsbackend.DTO.Request.ReleaseNoteRequestDTO;
import org.example.siidsbackend.DTO.Request.SeizureNoteRequestDTO;
import org.example.siidsbackend.DTO.Response.PageResponseDTO;
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
import java.util.Comparator;
import java.util.Locale;
import java.util.UUID;
import java.util.ArrayList;

@Service
@lombok.extern.slf4j.Slf4j
public class PhysicalStockService {
    private static final java.util.Set<String> PDF_EXTENSIONS = java.util.Set.of(".pdf");

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
    private final FileStorageService fileStorageService;

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
                                PasswordEncoder passwordEncoder,
                                FileStorageService fileStorageService) {
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
        this.fileStorageService = fileStorageService;
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
        note.setFullDescription(goods);
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
        note.setFullDescription(goods != null && !goods.isEmpty() ? goods : "N/A");
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

    public PageResponseDTO<SeizureNote> getTemporaryStockPage(int page, int size, String search) {
        return toPageResponse(filterStockRows(getTemporaryStock(), search, "ALL"), page, size);
    }

    public List<SeizureNote> getSeizureHistory(Employee officer) {
        return seizureNoteRepository.findByPvInChargeOrderByCreatedAtDesc(officer);
    }

    public List<SeizureNote> getSeizureHistory(String username) {
        if (isAdminUsername(username)) {
            return seizureNoteRepository.findAllByOrderByCreatedAtDesc();
        }
        return getSeizureHistory(getEmployeeByUsername(username));
    }

    public PageResponseDTO<SeizureNote> getSeizureHistoryPage(String username, int page, int size, String search, String status) {
        return toPageResponse(filterStockRows(getSeizureHistory(username), search, status), page, size);
    }

    private List<SeizureNote> filterStockRows(List<SeizureNote> rows, String search, String status) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String normalizedStatus = status == null || status.isBlank() ? "ALL" : status.trim().toUpperCase(Locale.ROOT);

        return rows.stream()
                .filter(row -> normalizedSearch.isBlank()
                        || safeContains(row.getSeizureNumber(), normalizedSearch)
                        || safeContains(row.getTaxpayerName(), normalizedSearch))
                .filter(row -> matchesStockStatusFilter(row, normalizedStatus))
                .sorted(Comparator.comparing(
                        SeizureNote::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private boolean matchesStockStatusFilter(SeizureNote row, String filter) {
        if ("ALL".equals(filter)) {
            return true;
        }
        String status = row.getStatus() == null ? "" : row.getStatus().name();
        if ("ESCALATED".equals(filter)) {
            return status.equals("ESCALATED")
                    || status.equals("IN_MAIN_STOCK")
                    || status.equals("PENDING_REVIEW")
                    || status.equals("IN_STOCK");
        }
        if ("RETURNED".equals(filter)) {
            return status.equals("RETURNED_FOR_CORRECTION") || status.equals("RETURNED");
        }
        if ("RELEASED".equals(filter)) {
            return status.contains("RELEASED");
        }
        return true;
    }

    private boolean safeContains(String value, String search) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(search);
    }

    private PageResponseDTO<SeizureNote> toPageResponse(List<SeizureNote> rows, int requestedPage, int requestedSize) {
        int size = requestedSize > 0 ? Math.min(requestedSize, 100) : 10;
        int page = Math.max(requestedPage, 0);
        int totalElements = rows.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);
        return new PageResponseDTO<>(rows.subList(fromIndex, toIndex), page, size, totalElements, totalPages);
    }

    private boolean isAdminUsername(String username) {
        return userRepo.findByUsername(username)
                .map(User::getRole)
                .map(this::normalizeRole)
                .map("admin"::equals)
                .orElse(false);
    }

    private String normalizeRole(String role) {
        return role == null ? "" : role.replace("ROLE_", "").replace(" ", "").replace("_", "").toLowerCase();
    }

    public String generateNextSeizureNumber() {
        String currentYear = String.valueOf(LocalDateTime.now().getYear());
        String prefix = "SN-" + currentYear + "-";
        String nextNumber = "00001";

        java.util.Optional<SeizureNote> lastNote = seizureNoteRepository.findFirstBySeizureNumberStartingWithOrderByIdDesc(prefix);
        if (lastNote.isPresent()) {
            String lastNum = lastNote.get().getSeizureNumber();
            if (lastNum != null && lastNum.startsWith(prefix)) {
                try {
                    String sequencePart = lastNum.substring(lastNum.lastIndexOf("-") + 1);
                    int nextSeq = Integer.parseInt(sequencePart) + 1;
                    nextNumber = String.format("%05d", nextSeq);
                } catch (Exception e) {
                    nextNumber = java.util.UUID.randomUUID().toString().substring(0, 5).toUpperCase();
                }
            }
        }
        return prefix + nextNumber;
    }

    @Transactional
    public ReleaseNote releaseFromTemporaryStock(Integer seizureId, ReleaseNoteRequestDTO dto, Employee currentUser) {
        if (seizureId > 1000000) {
            Stock stock = stockRepository.findById(seizureId - 1000000).orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            SeizureNote mapped = mapLegacyStockToSeizureNote(stock);
            mapped.setId(null);
            mapped.setStatus(PhysicalStockStatus.PENDING_REVIEW);
            mapped.setPvInCharge(currentUser);
            mapped = seizureNoteRepository.save(mapped);
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
            return releaseFromTemporaryStock(mapped.getId(), dto, currentUser);
        }

        SeizureNote note = seizureNoteRepository.findById(seizureId)
                .orElseThrow(() -> new IllegalArgumentException("Seizure note not found"));

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
    public SeizureNote escalateToMainStock(Integer seizureId, EscalateRequestDTO dto, Employee currentUser) {
        if (seizureId > 1000000) {
            Stock stock = stockRepository.findById(seizureId - 1000000).orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            SeizureNote mapped = mapLegacyStockToSeizureNote(stock);
            mapped.setId(null);
            mapped.setStatus(PhysicalStockStatus.PENDING_REVIEW);
            mapped.setPvInCharge(currentUser);
            mapped = seizureNoteRepository.save(mapped);
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
            return escalateToMainStock(mapped.getId(), dto, currentUser);
        }

        SeizureNote note = seizureNoteRepository.findById(seizureId)
                .orElseThrow(() -> new IllegalArgumentException("Seizure note not found"));

        String generatedPv = "PV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 1. Update Note Status & Reference
        note.setStatus(PhysicalStockStatus.PENDING_REVIEW);
        note.setPvNumber(generatedPv);
        note.setReturnReason(null);
        note.setActionedAt(LocalDateTime.now());
        
        // 2. Establish the PV Document (Surveillance Officer performs this)
        PVDocument pv = new PVDocument();
        pv.setPvNumber(generatedPv);
        pv.setSeizureNote(note);
        pv.setPvInCharge(currentUser);
        pv.setTransferDate(LocalDateTime.now());
        pv.setApplicableLawReference(dto.getApplicableLawReference());
        pv.setFormalStatementText(dto.getFormalStatementText());
        pvDocumentRepository.save(pv);

        SeizureNote saved = seizureNoteRepository.save(note);
        auditService.logAction(note.getSeizureNumber(), "ESCALATED", "Escalated to Main Stock with PV: " + generatedPv + ". Awaiting review.", currentUser);
        
        // 3. Notify All Stock Managers
        List<User> managers = userRepo.findByNormalizedRole("stockmanager");
        String senderName = currentUser.getGivenName() + " " + currentUser.getFamilyName();
        for (User m : managers) {
            employeeRepo.findByEmployeeId(m.getUsername()).ifPresent(e -> {
                notificationService.createAndSendStockNotification(
                    "Action Required: New goods intake pending review for PV " + generatedPv + " from " + senderName, 
                    e, 
                    "NEW_INTAKE",
                    generatedPv,
                    senderName
                );
            });
        }

        return saved;
    }

    @Transactional
    public SeizureNote createSeizureNote(SeizureNoteRequestDTO dto, Employee currentUser) {
        // Password-based authorization
        User user = userRepo.findByUsername(currentUser.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("User account not found for current employee"));

        if (dto.getAuthorizationPassword() == null || !passwordEncoder.matches(dto.getAuthorizationPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid authorization password");
        }

        SeizureNote note = new SeizureNote();
        note.setSeizureNumber(generateNextSeizureNumber());
        
        if (dto.getCaseRef() != null && !dto.getCaseRef().isEmpty()) {
            Case c = caseRepo.findByCaseNum(dto.getCaseRef()).orElse(null);
            note.setRelatedCase(c);
            
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
        note.setGoodsDescription(dto.getGoodsDescription());
        applySeizureDetails(note, dto);
        note.setSeizureReason(dto.getSeizureReason());
        note.setDateTimeSeized(dto.getDateTimeSeized() != null ? dto.getDateTimeSeized() : LocalDateTime.now());
        note.setPvInCharge(currentUser);
        
        // Starts in Temporary Stock for 30-day justification period
        note.setStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK); 

        note.setOfficerSignaturePath("Digital Signature verified via Password");

        SeizureNote saved = seizureNoteRepository.save(note);
        auditService.logAction(saved.getSeizureNumber(), "CREATED", "Entered system as IN_TEMPORARY_STOCK", currentUser);
        return saved;
    }

    @Transactional
    public SeizureNote updateSeizureNote(Integer id, SeizureNoteRequestDTO dto, Employee currentUser) {
        // Password-based authorization
        User user = userRepo.findByUsername(currentUser.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("User account not found for current employee"));

        if (dto.getAuthorizationPassword() == null || !passwordEncoder.matches(dto.getAuthorizationPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid authorization password");
        }

        SeizureNote note = seizureNoteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Seizure note not found"));

        // Allow editing if it's in initial temp stock or returned for correction
        if (note.getStatus() != PhysicalStockStatus.IN_TEMPORARY_STOCK && 
            note.getStatus() != PhysicalStockStatus.RETURNED_FOR_CORRECTION &&
            note.getStatus() != PhysicalStockStatus.RETURNED) {
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
        applySeizureDetails(note, dto);
        note.setSeizureReason(dto.getSeizureReason());
        if (dto.getDateTimeSeized() != null) {
            note.setDateTimeSeized(dto.getDateTimeSeized());
        }
        
        // Resubmitting after fix moves it to PENDING_REVIEW for Stock Manager
        note.setStatus(PhysicalStockStatus.PENDING_REVIEW);
        note.setReturnReason(null);

        SeizureNote saved = seizureNoteRepository.save(note);
        auditService.logAction(saved.getSeizureNumber(), "UPDATED", "Corrected and resubmitted for intake review", currentUser);
        
        // Notify All Stock Managers
        List<User> managers = userRepo.findByNormalizedRole("stockmanager");
        String senderName = currentUser.getGivenName() + " " + currentUser.getFamilyName();
        for (User m : managers) {
            employeeRepo.findByEmployeeId(m.getUsername()).ifPresent(e -> {
                notificationService.createAndSendStockNotification(
                    "Correction Submitted: Seizure note for PV " + note.getPvNumber() + " has been corrected by " + senderName, 
                    e, 
                    "INTAKE_CORRECTED",
                    note.getPvNumber(),
                    senderName
                );
            });
        }

        return saved;
    }

    private void applySeizureDetails(SeizureNote note, SeizureNoteRequestDTO dto) {
        note.setQuantity(dto.getQuantity());
        note.setQuantityType(normalize(dto.getQuantityType()));
        note.setFullDescription(normalize(dto.getFullDescription()));
        note.setLocationOfSeizure(normalize(dto.getLocationOfSeizure()));
        note.setConditionOfGoods(normalize(dto.getConditionOfGoods()));
        note.setConveyanceMeans(normalize(dto.getConveyanceMeans()));
        note.setConveyanceRegistration(normalize(dto.getConveyanceRegistration()));
    }

    private String normalize(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    @Transactional
    public SeizureNote approveIntake(Integer id, Employee stockManager) {
        SeizureNote note;
        
        if (id > 1000000) {
            Stock stock = stockRepository.findById(id - 1000000)
                    .orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            
            // 1. Migrate legacy to modern SN
            note = mapLegacyStockToSeizureNote(stock);
            note.setId(null);
            note.setPvNumber(stock.getPvNumber());
            
            // 2. Mark legacy as migrated
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
        } else {
            note = seizureNoteRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Goods not found"));
        }

        if (note.getStatus() != PhysicalStockStatus.PENDING_REVIEW && 
            note.getStatus() != PhysicalStockStatus.ESCALATED &&
            note.getStatus() != PhysicalStockStatus.IN_TEMPORARY_STOCK) {
            throw new IllegalStateException("Only goods in review or escalated states can be approved into stock. Current status: " + note.getStatus());
        }

        // 3. Perform Intake Approval
        note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK);
        note.setApprovedBy(stockManager);
        note.setApprovedAt(LocalDateTime.now());
        note.setActionedAt(LocalDateTime.now());

        // Ensure a PV Document exists
        if (note.getPvNumber() == null || note.getPvNumber().isEmpty()) {
             String generatedPv = "PV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
             note.setPvNumber(generatedPv);
        }

        SeizureNote saved = seizureNoteRepository.save(note);
        auditService.logAction(saved.getSeizureNumber(), "INTAKE_APPROVED", "Physically verified and admitted to Main Stock by Manager.", stockManager);
        
        // Notify Surveillance Officer
        String managerName = stockManager.getGivenName() + " " + stockManager.getFamilyName();
        notificationService.createAndSendStockNotification(
            "Intake Approved: PV " + note.getPvNumber() + " has been officially admitted to Main Stock by " + managerName,
            note.getPvInCharge(), 
            "INTAKE_APPROVED",
            note.getPvNumber(),
            managerName
        );

        return saved;
    }

    @Transactional
    public void returnForCorrection(Integer id, String reason, Employee stockManager) {
        SeizureNote note = seizureNoteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Goods not found"));

        if (note.getStatus() != PhysicalStockStatus.PENDING_REVIEW) {
            throw new IllegalStateException("Only goods in PENDING_REVIEW can be returned. Current status: " + note.getStatus());
        }

        if (reason == null || reason.trim().length() < 10) {
            throw new IllegalArgumentException("Return reason must be at least 10 characters long");
        }

        note.setStatus(PhysicalStockStatus.RETURNED_FOR_CORRECTION);
        note.setReturnReason(reason);
        note.setReturnedBy(stockManager);
        note.setReturnDate(LocalDateTime.now());
        note.setCorrectionToken(UUID.randomUUID().toString());

        seizureNoteRepository.save(note);

        // Notify the specific Surveillance Officer
        if (note.getPvInCharge() != null) {
            String managerName = stockManager.getGivenName() + " " + stockManager.getFamilyName();
            String message = "Action Required: Goods " + note.getSeizureNumber() + " (PV: " + note.getPvNumber() + ") returned for correction. Reason: " + reason;
            notificationService.createAndSendStockNotification(message, note.getPvInCharge(), "SEIZURE_RETURNED", note.getSeizureNumber(), managerName);
        }

        auditService.logAction(note.getSeizureNumber(), "RETURNED", "Returned for correction by Stock Manager. Reason: " + reason, stockManager);
    }

    @Transactional
    public SeizureNote requestRelease(Integer id, ReleaseNoteRequestDTO dto, Employee stockManager) {
        if (id > 1000000) {
            Stock stock = stockRepository.findById(id - 1000000)
                    .orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            
            // Migrate legacy to modern SN
            SeizureNote migrated = mapLegacyStockToSeizureNote(stock);
            migrated.setId(null);
            migrated.setStatus(PhysicalStockStatus.IN_MAIN_STOCK);
            migrated.setPvNumber(stock.getPvNumber());
            migrated = seizureNoteRepository.save(migrated);
            
            // Mark legacy as migrated
            stock.setStatus("MIGRATED_TO_NEW_MODULE");
            stockRepository.save(stock);
            
            return requestRelease(migrated.getId(), dto, stockManager);
        }

        SeizureNote note = seizureNoteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Goods not found"));

        if (note.getStatus() != PhysicalStockStatus.IN_STOCK && note.getStatus() != PhysicalStockStatus.IN_MAIN_STOCK) {
            throw new IllegalStateException("Only goods currently IN_STOCK can be released. Current status: " + note.getStatus());
        }

        note.setStatus(PhysicalStockStatus.PENDING_PRSO_RELEASE_APPROVAL);
        note.setReleaseRequestedBy(stockManager);
        note.setReleaseRequestedAt(LocalDateTime.now());
        seizureNoteRepository.save(note);

        // Create Release Note record
        ReleaseNote release = new ReleaseNote();
        release.setReleaseNumber("RN-M-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        release.setSeizureNote(note);
        release.setReleaseType("MAIN_STOCK");
        release.setReleaseReason(dto.getReleaseReason());
        release.setReleaseDestination(dto.getReleaseDestination());
        
        // Disposal Data from Stock Manager
        release.setRecipientName(dto.getRecipientName());
        release.setRecipientIdPassport(dto.getRecipientIdPassport());
        release.setRecipientPhone(dto.getRecipientPhone());
        release.setAuctionAmount(dto.getAuctionAmount());
        
        release.setReleasedBy(stockManager);
        release.setStatus("PENDING");
        releaseNoteRepository.save(release);

        auditService.logAction(note.getSeizureNumber(), "RELEASE_REQUESTED", "Release request submitted to PRSO with Disposal Data", stockManager);
        
        // Notify All PRSOs
        List<User> prsos = userRepo.findByNormalizedRole("prso");
        String managerName = stockManager.getGivenName() + " " + stockManager.getFamilyName();
        for (User p : prsos) {
            employeeRepo.findByEmployeeId(p.getUsername()).ifPresent(e -> {
                notificationService.createAndSendStockNotification(
                    "Authorization Required: New release request for PV " + note.getPvNumber() + " submitted by " + managerName, 
                    e, 
                    "RELEASE_REQUESTED",
                    note.getPvNumber(),
                    managerName
                );
            });
        }

        return note;
    }

    @Transactional
    public void approveRelease(Integer id, Employee prsoUser) {
        SeizureNote note = seizureNoteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Goods not found"));

        if (note.getStatus() != PhysicalStockStatus.PENDING_RELEASE && note.getStatus() != PhysicalStockStatus.PENDING_PRSO_RELEASE_APPROVAL) {
            throw new IllegalStateException("Goods must be in PENDING_RELEASE state. Current: " + note.getStatus());
        }

        // Find the pending release record to get the auction details
        ReleaseNote release = releaseNoteRepository.findBySeizureNoteAndStatus(note, "PENDING")
                .stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Pending Release Note record not found for this item"));

        // 1. Finalize the Seizure Note
        note.setStatus(PhysicalStockStatus.RELEASED_FROM_MAIN);
        note.setReleasedAt(LocalDateTime.now());
        note.setAuctionWinner(release.getRecipientName()); // Use pre-filled winner from request
        note.setAuctionDate(LocalDateTime.now());
        note.setAuctionAmount(release.getAuctionAmount()); // Use pre-filled amount from request
        seizureNoteRepository.save(note);

        // 2. Finalize the Release Note
        release.setStatus("APPROVED");
        release.setPrsoApprover(prsoUser);
        release.setPrsoApprovalDate(LocalDateTime.now());
        release.setReleaseDate(LocalDateTime.now()); // Record final release date
        releaseNoteRepository.save(release);

        auditService.logAction(note.getSeizureNumber(), "RELEASED", "PRSO Authorized Release to " + release.getRecipientName(), prsoUser);
        
        // Notify Stock Manager
        if (note.getReleaseRequestedBy() != null) {
            String prsoName = prsoUser.getGivenName() + " " + prsoUser.getFamilyName();
            notificationService.createAndSendStockNotification(
                "Release AUTHORIZED: Release for PV " + note.getPvNumber() + " has been approved by PRSO " + prsoName,
                note.getReleaseRequestedBy(), 
                "RELEASE_APPROVED",
                note.getPvNumber(),
                prsoName
            );
        }
    }

    @Transactional
    public void rejectRelease(Integer id, String reason, Employee prsoUser) {
        SeizureNote note = seizureNoteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Goods not found"));

        if (note.getStatus() != PhysicalStockStatus.PENDING_RELEASE && note.getStatus() != PhysicalStockStatus.PENDING_PRSO_RELEASE_APPROVAL) {
            throw new IllegalStateException("Goods must be in PENDING_RELEASE state. Current: " + note.getStatus());
        }

        // Return to IN_MAIN_STOCK state
        note.setStatus(PhysicalStockStatus.IN_MAIN_STOCK);
        seizureNoteRepository.save(note);

        // Update the release note record
        ReleaseNote release = releaseNoteRepository.findBySeizureNoteAndStatus(note, "PENDING")
                .stream().findFirst().orElse(null);
        if (release != null) {
            release.setStatus("REJECTED");
            release.setRejectionReason(reason);
            release.setPrsoApprover(prsoUser);
            release.setPrsoApprovalDate(LocalDateTime.now());
            releaseNoteRepository.save(release);
        }

        auditService.logAction(note.getSeizureNumber(), "RELEASE_REJECTED", "PRSO Rejected Release. Reason: " + reason, prsoUser);
        
        // Notify Stock Manager
        if (note.getReleaseRequestedBy() != null) {
            String prsoName = prsoUser.getGivenName() + " " + prsoUser.getFamilyName();
            notificationService.createAndSendStockNotification(
                "Release REJECTED: Release for PV " + note.getPvNumber() + " was rejected by PRSO. Reason: " + reason,
                note.getReleaseRequestedBy(), 
                "RELEASE_REJECTED",
                note.getPvNumber(),
                prsoName
            );
        }
    }

    // --- MAIN STOCK (Stock Manager & PRSO) ---

    public List<SeizureNote> getAllGoodsForManager() {
        // 1. Fetch ALL seizure notes from the modern table
        java.util.List<SeizureNote> notes = new java.util.ArrayList<>(seizureNoteRepository.findAll());

        // 2. Add legacy stock that hasn't been migrated yet (Active or Released)
        List<Stock> legacyStocks = stockRepository.findAll();
        if (legacyStocks != null) {
            for (Stock s : legacyStocks) {
                // Legacy records that have PV numbers belong to the Manager's dashboard
                if (s.getPvNumber() != null && !s.getPvNumber().trim().isEmpty()) {
                    // Avoid duplication if already migrated (check by seizure number)
                    boolean alreadyMigrated = notes.stream()
                        .anyMatch(n -> n.getSeizureNumber() != null && n.getSeizureNumber().equals(s.getSeizureNumber()));
                    
                    if (!alreadyMigrated && !"MIGRATED_TO_NEW_MODULE".equals(s.getStatus())) {
                        SeizureNote legacyNote = mapLegacyStockToSeizureNote(s);
                        legacyNote.setPvNumber(s.getPvNumber()); // Ensure PV number is carried over
                        notes.add(legacyNote);
                    }
                }
            }
        }

        // 3. Enrich SeizureNote with pending ReleaseNote details for PRSO
        for (SeizureNote n : notes) {
            if (n.getStatus() == null) {
                n.setStatus(PhysicalStockStatus.PENDING_REVIEW); 
            }
            
            if (n.getStatus() == PhysicalStockStatus.PENDING_PRSO_RELEASE_APPROVAL || n.getStatus() == PhysicalStockStatus.PENDING_RELEASE) {
                releaseNoteRepository.findBySeizureNoteAndStatus(n, "PENDING")
                    .stream().findFirst().ifPresent(r -> {
                        n.setAuctionWinner(r.getRecipientName());
                        n.setAuctionAmount(r.getAuctionAmount());
                        n.setRepresentativeName(r.getRecipientName()); // Shared UI field
                        n.setRepresentativeContact(r.getRecipientPhone()); // Shared UI field
                    });
            }
        }

        return notes.stream()
                .sorted((a, b) -> {
                    LocalDateTime dateA = a.getCreatedAt() != null ? a.getCreatedAt() : (a.getDateTimeSeized() != null ? a.getDateTimeSeized() : LocalDateTime.MIN);
                    LocalDateTime dateB = b.getCreatedAt() != null ? b.getCreatedAt() : (b.getDateTimeSeized() != null ? b.getDateTimeSeized() : LocalDateTime.MIN);
                    return dateB.compareTo(dateA);
                })
                .toList();
    }

    public PageResponseDTO<SeizureNote> getMainStockPage(int page, int size, String search, String view, String sort) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String normalizedView = view == null || view.isBlank() ? "ALL" : view.trim().toUpperCase(Locale.ROOT);
        boolean ascending = "date_asc".equalsIgnoreCase(sort);

        List<SeizureNote> rows = getAllGoodsForManager().stream()
                .filter(row -> matchesMainStockView(row, normalizedView))
                .filter(row -> normalizedSearch.isBlank()
                        || safeContains(row.getSeizureNumber(), normalizedSearch)
                        || safeContains(row.getPvNumber(), normalizedSearch)
                        || safeContains(row.getTaxpayerName(), normalizedSearch)
                        || safeContains(row.getTaxpayerTin(), normalizedSearch)
                        || safeContains(row.getGoodsDescription(), normalizedSearch))
                .sorted((left, right) -> {
                    LocalDateTime leftDate = left.getCreatedAt() != null ? left.getCreatedAt() : left.getDateTimeSeized();
                    LocalDateTime rightDate = right.getCreatedAt() != null ? right.getCreatedAt() : right.getDateTimeSeized();
                    int comparison = Comparator.nullsLast(LocalDateTime::compareTo).compare(leftDate, rightDate);
                    return ascending ? comparison : -comparison;
                })
                .toList();

        return toPageResponse(rows, page, size);
    }

    private boolean matchesMainStockView(SeizureNote row, String view) {
        String status = row.getStatus() == null ? "" : row.getStatus().name();
        return switch (view) {
            case "PENDING_REVIEW" -> status.equals("PENDING_REVIEW")
                    || status.equals("RETURNED")
                    || status.equals("ESCALATED")
                    || status.equals("RETURNED_FOR_CORRECTION")
                    || status.equals("IN_TEMPORARY_STOCK")
                    || status.equals("PENDING_JUSTIFICATION");
            case "IN_WAREHOUSE" -> status.equals("IN_STOCK")
                    || status.equals("IN_MAIN_STOCK")
                    || (!List.of(
                    "PENDING_REVIEW",
                    "RETURNED",
                    "ESCALATED",
                    "RETURNED_FOR_CORRECTION",
                    "PENDING_RELEASE",
                    "PENDING_PRSO_RELEASE_APPROVAL",
                    "RELEASED",
                    "RELEASED_FROM_MAIN",
                    "IN_TEMPORARY_STOCK",
                    "PENDING_JUSTIFICATION").contains(status));
            case "PENDING_RELEASE" -> status.equals("PENDING_RELEASE")
                    || status.equals("PENDING_PRSO_RELEASE_APPROVAL")
                    || status.equals("PENDING_PRSO_EDIT_APPROVAL");
            case "RELEASED" -> status.equals("RELEASED") || status.equals("RELEASED_FROM_MAIN");
            default -> true;
        };
    }

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

    // Edit request methods removed as per requirements

    public byte[] generateSeizureNotePdf(Integer seizureId) throws java.io.IOException {
        return generateSeizureNotePdf(seizureId, null);
    }

    public byte[] generateSeizureNotePdf(Integer seizureId, String username) throws java.io.IOException {
        SeizureNote note;
        if (seizureId > 1000000) {
            Stock stock = stockRepository.findById(seizureId - 1000000)
                    .orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            note = mapLegacyStockToSeizureNote(stock);
        } else {
            note = seizureNoteRepository.findById(seizureId)
                    .orElseThrow(() -> new IllegalArgumentException("Seizure note not found"));
        }

        validateSeizureNotePdfAccess(note, username);
        
        byte[] pdfBytes = pdfService.generateSeizureNote(note);
        
        // Archive a copy to local directory
        savePdfToLocal(pdfBytes, "SeizureNote-" + note.getSeizureNumber().replace("/", "-") + ".pdf", "seizure-notes");
        
        return pdfBytes;
    }

    private void savePdfToLocal(byte[] data, String filename, String subDir) {
        try {
            String storedPath = fileStorageService.storeBytes(data, filename, subDir, PDF_EXTENSIONS);
            if (storedPath != null) {
                log.info("PDF archived successfully to: {}", storedPath);
            } else {
                log.warn("PDF archive skipped because no data was written");
            }
        } catch (Exception e) {
            log.error("Failed to archive PDF locally: {}", e.getMessage());
        }
    }

    public byte[] generatePVDocumentPdf(Integer identifier, String username) throws java.io.IOException {
        log.info("Generating PV PDF for identifier: {} requested by {}", identifier, username);
        
        Employee stockManager = employeeRepo.findByEmployeeId(username).orElse(null);
        PVDocument pv = null;

        // 1. Handle Legacy ID
        if (identifier > 1000000) {
            Stock stock = stockRepository.findById(identifier - 1000000)
                    .orElseThrow(() -> new IllegalArgumentException("Legacy stock not found"));
            pv = mapLegacyStockToPVDocument(stock);
            return pdfService.generatePVDocument(pv, stockManager);
        }

        // 2. Try as PVDocument ID first
        Optional<PVDocument> optPv = pvDocumentRepository.findById(identifier);
        if (optPv.isPresent()) {
            pv = optPv.get();
        } else {
            // 3. Try as SeizureNote ID (since the manager dashboard is Note-based)
            Optional<SeizureNote> optNote = seizureNoteRepository.findById(identifier);
            if (optNote.isPresent()) {
                pv = pvDocumentRepository.findBySeizureNote(optNote.get())
                        .orElseThrow(() -> new IllegalArgumentException("PV Document not yet established for this Seizure Note"));
            }
        }

        if (pv == null) {
            throw new IllegalArgumentException("PV Document not found for ID: " + identifier);
        }

        validatePVDocumentPdfAccess(pv, username);

        return pdfService.generatePVDocument(pv, stockManager);
    }

    public byte[] generateReleaseNotePdf(Integer releaseId) throws java.io.IOException {
        return generateReleaseNotePdf(releaseId, null);
    }

    public byte[] generateReleaseNotePdf(Integer releaseId, String username) throws java.io.IOException {
        ReleaseNote release = releaseNoteRepository.findById(releaseId)
                .orElseThrow(() -> new IllegalArgumentException("Release note not found"));
        validateReleaseNotePdfAccess(release, username);
        return pdfService.generateReleaseNote(release);
    }

    private void validateSeizureNotePdfAccess(SeizureNote note, String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        if (isPrivilegedStockPdfUser(username)) {
            return;
        }
        if (note.getPvInCharge() != null && username.equals(note.getPvInCharge().getEmployeeId())) {
            return;
        }
        if (note.getReleaseRequestedBy() != null && username.equals(note.getReleaseRequestedBy().getEmployeeId())) {
            return;
        }
        if (note.getApprovedBy() != null && username.equals(note.getApprovedBy().getEmployeeId())) {
            return;
        }
        throw new SecurityException("You do not have permission to access this seizure note PDF");
    }

    private void validatePVDocumentPdfAccess(PVDocument pv, String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        if (isPrivilegedStockPdfUser(username)) {
            return;
        }
        if (pv.getPvInCharge() != null && username.equals(pv.getPvInCharge().getEmployeeId())) {
            return;
        }
        if (pv.getSeizureNote() != null) {
            validateSeizureNotePdfAccess(pv.getSeizureNote(), username);
            return;
        }
        throw new SecurityException("You do not have permission to access this PV document PDF");
    }

    private void validateReleaseNotePdfAccess(ReleaseNote release, String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        if (isPrivilegedStockPdfUser(username)) {
            return;
        }
        if (release.getReleasedBy() != null && username.equals(release.getReleasedBy().getEmployeeId())) {
            return;
        }
        if (release.getPrsoApprover() != null && username.equals(release.getPrsoApprover().getEmployeeId())) {
            return;
        }
        if (release.getSeizureNote() != null) {
            validateSeizureNotePdfAccess(release.getSeizureNote(), username);
            return;
        }
        if (release.getPvDocument() != null) {
            validatePVDocumentPdfAccess(release.getPvDocument(), username);
            return;
        }
        throw new SecurityException("You do not have permission to access this release note PDF");
    }

    private boolean isPrivilegedStockPdfUser(String username) {
        return userRepo.findByUsername(username)
                .map(user -> {
                    String role = user.getRole() == null ? "" : user.getRole()
                            .replace("ROLE_", "")
                            .replace(" ", "")
                            .replace("_", "")
                            .trim()
                            .toLowerCase();
                    return role.equals("admin") || role.equals("stockmanager") || role.equals("prso");
                })
                .orElse(false);
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
