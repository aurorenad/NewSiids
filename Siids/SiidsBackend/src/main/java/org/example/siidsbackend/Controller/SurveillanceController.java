package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Request.StockRequestDTO;
import org.example.siidsbackend.Model.*;
import org.example.siidsbackend.Service.StockService;
import org.example.siidsbackend.Service.SurveillanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/surveillance")
@RequiredArgsConstructor
@Slf4j
public class SurveillanceController {
    private final SurveillanceService surveillanceService;
    private final StockService stockService;

    @PostMapping("/mapping")
    public ResponseEntity<SurveillanceMapping> createMapping(
            @RequestBody Map<String, Object> body,
            @RequestHeader("employee_id") String employeeId) {
        try {
            String target = (String) body.get("targetName");
            String location = (String) body.get("location");
            String route = (String) body.get("smugglingRoute");
            String items = (String) body.get("suspectedItems");
            @SuppressWarnings("unchecked")
            List<String> officerIds = (List<String>) body.get("officerIds");

            SurveillanceMapping mapping = surveillanceService.createMapping(target, location, route, items, officerIds, employeeId);
            return ResponseEntity.ok(mapping);
        } catch (Exception e) {
            log.error("Error creating surveillance mapping: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/reports")
    public ResponseEntity<SurveillanceReport> submitReport(
            @RequestParam("mappingId") Integer mappingId,
            @RequestParam("findings") String findings,
            @RequestParam("interrogation") String interrogation,
            @RequestParam("pvNumber") String pvNumber,
            @RequestParam("seizureNumber") String seizureNumber,
            @RequestParam(value = "stockId", required = false) Integer stockId,
            @RequestParam(value = "attachments", required = false) List<String> attachments,
            @RequestHeader("employee_id") String employeeId) {
        try {
            SurveillanceReport report = surveillanceService.submitReport(mappingId, findings, interrogation, pvNumber, seizureNumber, stockId, attachments, employeeId);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            log.error("Error submitting surveillance report: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/handover-to-store")
    public ResponseEntity<Stock> handoverToStore(
            @RequestPart("stockData") StockRequestDTO stockData,
            @RequestPart("documents") List<MultipartFile> documents,
            @RequestPart(value = "anotherDocument", required = false) MultipartFile anotherDocument,
            @RequestHeader("employee_id") String employeeId) {
        try {
            // Check if user is Surveillance or Store staff
            Stock stock = stockService.createStock(stockData, documents, anotherDocument, null);
            return ResponseEntity.ok(stock);
        } catch (Exception e) {
            log.error("Error handing over to store: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/reports/pending")
    public ResponseEntity<List<SurveillanceReport>> getPendingReports() {
        return ResponseEntity.ok(surveillanceService.getPendingReports());
    }

    @PostMapping("/reports/{id}/approve-prso")
    public ResponseEntity<SurveillanceReport> approvePRSO(
            @PathVariable Integer id,
            @RequestHeader("employee_id") String employeeId) {
        return ResponseEntity.ok(surveillanceService.approveReportPRSO(id, employeeId));
    }

    @PostMapping("/reports/{id}/submit-ac")
    public ResponseEntity<SurveillanceReport> submitToAC(@PathVariable Integer id) {
        return ResponseEntity.ok(surveillanceService.submitToAC(id));
    }
}
